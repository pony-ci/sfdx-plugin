import {AnyJson, Dictionary, isAnyJson, isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import chalk from 'chalk';
import {spawn} from 'child_process';
import {Jobs} from '..';
import {Job, Step} from '../types/jobs.schema';
import {getLogger, getUX} from './pubsub';

export interface IPCMessage {
    pony: {
        env?: AnyJson;
    };
}

type Variables = Dictionary<EnvValue>;

export const isIPCMessage = (value: unknown): value is IPCMessage =>
    isAnyJson(value) && isJsonMap(value) && 'pony' in value && isJsonMap(value.pony);

export type EnvValue = Optional<string | string[]>;

function isEnvValue(value: unknown): value is EnvValue {
    return !value || isString(value) || (isArray(value) && value.every(isString));
}

export class Environment {
    public readonly variables: Variables;

    private constructor(variables: Variables) {
        this.variables = variables;
    }

    public static create(): Environment {
        return new Environment({});
    }

    public getEnv(name: string): Optional<EnvValue> {
        return this.variables[name];
    }

    public setEnv(name: string, value: Optional<EnvValue>): void {
        this.variables[name] = value;
    }

    public clone(): Environment {
        return new Environment(
            JSON.parse(JSON.stringify(this.variables))
        );
    }
}

export async function executeJobByName(jobs: Jobs, name: string, env: Environment): Promise<Environment> {
    if (!jobs[name]) {
        throw Error(`Job not found: ${name}`);
    }
    const ux = await getUX();
    ux.log(chalk.blueBright.bold(`=== [job] ${name}`));
    return executeJob(jobs, jobs[name], env);
}

export async function executeJob(jobs: Jobs, job: Job, env: Environment): Promise<Environment> {
    const logger = await getLogger();
    logger.info('run job', job, env);
    let currEnv = env;
    for (const step of job.steps || []) {
        currEnv = await executeStep(jobs, step, currEnv);
    }
    return currEnv;
}

function isValidEnvValue(value: Optional<string>): boolean {
    return !(isString(value) && !RegExp('^[a-zA-Z_]+=.*$').test(value));
}

export async function executeStep(jobs: Jobs, step: Step, environment: Environment): Promise<Environment> {
    const ux = await getUX();
    const logger = await getLogger();
    logger.info('run step', step, environment);
    const stepKey = Object.keys(step)[0];
    const stepValue = prepareCommandArgs(Object.values(step)[0], environment);
    const newEnv = environment.clone();
    if (stepKey === 'env') {
        if (!isValidEnvValue(stepValue)) {
            throw Error(`Invalid env value: ${stepValue}`);
        }
        const keyPair = stepValue.split('=');
        ux.log(`${chalk.blueBright('[env]')} ${stepValue}`);
        newEnv.setEnv(keyPair[0], keyPair[1]);
    } else if (stepKey === 'echo') {
        ux.log(`${chalk.blueBright(`[echo]`)} ${Object.values(step)[0]}`);
        ux.log(stepValue);
    } else if (stepKey === 'job') {
        return executeJobByName(jobs, stepValue, newEnv);
    } else {
        return executeCommand(stepKey, stepValue, newEnv);
    }
    return newEnv;
}

async function executeCommand(stepKey: string, stepValue: string, environment: Environment): Promise<Environment> {
    const ux = await getUX();
    const logger = await getLogger();
    const command = stepKey === 'run' ? stepValue : [stepKey, stepValue].join(' ');
    ux.log(`${chalk.blueBright(`[run]`)} ${command}`);
    logger.info('spawn', command);
    const cmd = spawn(command, [], {
        shell: true,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    cmd.on('message', (message) => {
        if (isIPCMessage(message)) {
            logger.info('ipc message', JSON.stringify(message, null, 4));
            const {env = {}} = message.pony;
            if (isJsonMap(env)) {
                for (const [key, value] of Object.entries(env)) {
                    if (isEnvValue(value)) {
                        environment.setEnv(key, value);
                    }
                }
            }
        }
    });
    return new Promise((resolve, reject) => {
        const error = (code) => `Command exited with code ${code} [${command}]`;
        cmd.on('close', (code) => code ? reject(error(code)) : resolve(environment));
    });
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