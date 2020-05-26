import {AnyJson, Dictionary, isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import {spawn} from 'child_process';
import {Jobs} from '..';
import {Job, Step} from '../types/jobs.schema';
import {getLogger, getUX} from './pubsub';

export interface JobMessage {
    pony: {
        env: AnyJson;
    };
}

export type EnvValue = Optional<string | string[]>;

function isEnvValue(value: unknown): value is EnvValue {
    return !value || isString(value) || (isArray(value) && value.every(isString));
}

export class Environment {
    private variables: Dictionary<EnvValue> = {};

    public static create(): Environment {
        return new Environment();
    }

    public getEnv(name: string): Optional<EnvValue> {
        return this.variables[name];
    }

    public setEnv(name: string, value: Optional<EnvValue>): void {
        this.variables[name] = value;
    }

    public clone(): Environment {
        const cloned = new Environment();
        cloned.variables = JSON.parse(JSON.stringify(this.variables));
        return cloned;
    }
}

export async function executeJobByName(jobs: Jobs, name: string, env: Environment): Promise<Environment> {
    if (!jobs[name]) {
        throw Error(`Job not found: ${name}`);
    }
    return executeJob(jobs, jobs[name], env);
}

export async function executeJob(jobs: Jobs, job: Job, env: Environment): Promise<Environment> {
    const logger = await getLogger();
    logger.info('exec job', job, env);
    let currEnv = env;
    for (const step of job.steps) {
        currEnv = await executeStep(jobs, step, currEnv);
    }
    return currEnv;
}

function isValidEnvValue(value: Optional<string>): boolean {
    return !(isString(value) && !RegExp('^[a-zA-Z_]+=.*$').test(value));
}

export async function executeStep(jobs: Jobs, step: Step, env: Environment): Promise<Environment> {
    const ux = await getUX();
    const logger = await getLogger();
    logger.info('exec step', step, env);
    const stepKey = Object.keys(step)[0];
    const stepValue = prepareCommandArgs(Object.values(step)[0], env);
    const newEnv = env.clone();
    if (stepKey === 'env') {
        if (!isValidEnvValue(stepValue)) {
            throw Error(`Invalid env value: ${stepValue}`);
        }
        const keyPair = stepValue.split('=');
        ux.log(`env: ${stepValue}`);
        newEnv.setEnv(keyPair[0], keyPair[1]);
    } else if (stepKey === 'echo') {
        ux.log(`echo: ${stepValue}`);
        ux.log(stepValue);
    } else if (stepKey === 'job') {
        return executeJobByName(jobs, stepValue, newEnv);
    } else {
        const command = `${stepKey === 'run' ? '' : stepKey} ${stepValue}`;
        ux.log(`$ ${command}`);
        logger.info('spawn', command);
        const cmd = spawn(command, [], {
            shell: true,
            stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        });
        cmd.on('message', (message) => {
            if (isJsonMap(message) && 'pony' in message) {
                console.log('child message', JSON.stringify(message, null, 4));
                logger.info('child message', JSON.stringify(message, null, 4));
                const pony = message.pony;
                if (isJsonMap(pony) && 'env' in pony && isJsonMap(pony.env) && pony.env) {
                    for (const [key, value] of Object.entries(pony.env)) {
                        if (isEnvValue(value)) {
                            newEnv.setEnv(key, value);
                        }
                    }
                }
            }
        });
        return new Promise((resolve) => {
            cmd.on('exit', () => resolve(newEnv));
        });
    }
    return newEnv;
}

export function prepareCommandArgs(args: string, env: Environment): string {
    let result = args;
    while (result.includes('$env.') || result.includes('${env.')) {
        const match = /(\$env\.[a-zA-Z_]+)|(\${env\.[a-zA-Z_]+})/mi.exec(result);
        if (match && (match[1] || match[2])) {
            const matched = match[1] || match[2];
            const endsWithBracket = matched.lastIndexOf('}') === matched.length - 1;
            const envNamePart = matched.substr(matched.lastIndexOf('.') + 1);
            const envName = envNamePart.substr(0, endsWithBracket ? envNamePart.length - 1 : envNamePart.length);
            const envValue = env.getEnv(envName) || '';
            result = result.replace(matched, isArray(envValue) ? envValue.map(it => `"${it}"`).join(' ') : envValue);
        } else {
            throw Error(`Malformed: ${args}`);
        }
    }
    return result;
}