import {Dictionary, isAnyJson, isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import chalk from 'chalk';
import {spawn} from 'child_process';
import {Jobs} from '..';
import {Job, Step} from '../types/jobs.schema';
import {getLogger, getUX} from './pubsub';

export interface IPCMessage {
    pony: {
        env: {
            variables: Variables;
        };
    };
}

type Variables = Dictionary<EnvValue>;

export const isIPCMessage = (value: unknown): value is IPCMessage =>
    isAnyJson(value) && isJsonMap(value) && 'pony' in value && isJsonMap(value.pony);

export type EnvValue = Optional<string>;

function isEnvValue(value: unknown): value is EnvValue {
    return !value || isString(value) || (isArray(value) && value.every(isString));
}

export class Environment {
    public readonly variables: Variables;

    private constructor(variables: Variables) {
        this.variables = variables;
    }

    public static create(variables: Variables = {}): Environment {
        return new Environment(variables);
    }

    public static parse(json: string): Environment {
        const {variables} = JSON.parse(json);
        return Environment.create(variables);
    }

    public static stringify(env: Environment): string {
        return JSON.stringify({variables: env.variables});
    }

    public getEnv(name: string): Optional<EnvValue> {
        return this.variables[name];
    }

    public setEnv(name: string, value: Optional<EnvValue>): void {
        this.variables[name] = value;
        this.sendMessage({
            env: {
                variables: this.variables
            }
        });
    }

    public clone(): Environment {
        return Environment.parse(Environment.stringify(this));
    }

    public fillString(str: string): string {
        let result = str;
        while (result.includes('$env.') || result.includes('${env.')) {
            const match = /(\$env\.[a-zA-Z_]+)|(\${env\.[a-zA-Z_]+})/mi.exec(result);
            if (match && (match[1] || match[2])) {
                const matched = match[1] || match[2];
                const endsWithBracket = matched.lastIndexOf('}') === matched.length - 1;
                const envNamePart = matched.substr(matched.lastIndexOf('.') + 1);
                const envName = envNamePart.substr(0, endsWithBracket ? envNamePart.length - 1 : envNamePart.length);
                const envValue = this.getEnv(envName) || '';
                result = result.replace(matched, envValue);
            } else {
                throw Error(`Malformed: ${str}`);
            }
        }
        return result;
    }

    private sendMessage(message: IPCMessage['pony']): void {
        if (process.send) {
            process.send({
                pony: message
            });
        }
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
    const stepValue = environment.fillString(Object.values(step)[0]);
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
    let command = stepKey === 'run' ? stepValue : [stepKey, stepValue].join(' ');
    ux.log(`${chalk.blueBright(`[run] ${command}`)}`);
    const supportsEnvArg = (c) => ['pony:source:content:replace', 'pony:source:push'].some(it => c.includes(it));
    command = supportsEnvArg(command)
        ? `${command} --ponyenv '${Environment.stringify(environment)}'` : command;
    console.log({usingEnv: environment});
    console.log(command);
    logger.info('spawn', command);
    const cmd = spawn(command, [], {
        shell: true,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    let newEnvironment = environment;
    cmd.on('message', (message) => {
        if (isIPCMessage(message)) {
            logger.info('ipc message', JSON.stringify(message, null, 4));
            const {env} = message.pony;
            newEnvironment = Environment.create(env.variables);
        }
    });
    return new Promise((resolve, reject) => {
        const error = (code) => `Command exited with code ${code} [${command}]`;
        cmd.on('close', (code) => code ? reject(error(code)) : resolve(newEnvironment));
    });
}