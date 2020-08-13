import {Dictionary, isAnyJson, isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import chalk from 'chalk';
import {spawn} from 'child_process';
import fs from 'fs-extra';
import {Jobs} from '..';
import {Step} from '../types/jobs.schema';
import {getLogger, getUX} from './pubsub';
import {tmp} from './tmp';

type Variables = Dictionary<EnvValue>;
type HrTime = [number, number];

export type EnvValue = Optional<string>;

function isEnvValue(value: unknown): value is EnvValue {
    return !value || isString(value) || (isArray(value) && value.every(isString));
}

export class Environment {
    public readonly hrtime: [number, number];
    private readonly variables: Variables;
    private readonly file?: string;

    private constructor(variables: Variables, hrtime: HrTime, file?: string) {
        this.variables = variables;
        this.hrtime = hrtime;
        this.file = file;
    }

    public static create(variables: Variables, hrtime: HrTime, file?: string): Environment {
        return new Environment(variables, hrtime, file);
    }

    public static load(file?: string): Environment {
        if (!file) {
            return Environment.createDefault();
        }
        const {variables, hrtime} = fs.readJSONSync(file);
        return Environment.create(variables, hrtime, file);
    }

    public static parse(json: string): Environment {
        const {variables, hrtime} = JSON.parse(json);
        return Environment.create(variables, hrtime);
    }

    public static createDefault(): Environment {
        return Environment.create({}, process.hrtime());
    }

    public static stringify(env: Environment): string {
        return JSON.stringify({variables: env.variables, hrtime: env.hrtime});
    }

    public save(file: string): void {
        fs.writeFileSync(file, Environment.stringify(this));
    }

    public getEnv(name: string): Optional<EnvValue> {
        return this.variables[name];
    }

    public setEnv(name: string, value: Optional<EnvValue>): void {
        this.variables[name] = value;
        const logger = getLogger();
        if (this.file) {
            logger.info(`set env [${name}]="${value}"`);
            const values = fs.readJSONSync(this.file);
            values.variables = this.variables;
            fs.writeJSONSync(this.file, values);
        }
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
}

export async function executeJobByName(
    jobs: Jobs, name: string, env: Environment
): Promise<Environment> {
    if (!jobs[name]) {
        throw Error(`Job not found: ${name}`);
    }
    const ux = getUX();
    const logger = getLogger();
    ux.log(chalk.cyanBright.bold(`=== [job] ${name}`));
    logger.info('run job', jobs[name], env);
    let currEnv = env;
    for (const step of jobs[name].steps || []) {
        const hrtimeStep = process.hrtime();
        const isJobStep = Object.keys(step)[0] === 'job';
        try {
            currEnv = await executeStep(jobs, step, currEnv);
        } catch (e) {
            throw e;
        } finally {
            if (!isJobStep) {
                ux.log(`time: ${secondsFormatter(process.hrtime(hrtimeStep)[0])} | total time: ${secondsFormatter(process.hrtime(env.hrtime)[0])}`);
            }
        }
    }
    return currEnv;
}

function isValidEnvValue(value: Optional<string>): boolean {
    return !(isString(value) && !RegExp('^[a-zA-Z_]+=.*$').test(value));
}

export async function executeStep(
    jobs: Jobs, step: Step, environment: Environment
): Promise<Environment> {
    const ux = getUX();
    const logger = getLogger();
    logger.info('run step', step, environment);
    const stepKey = Object.keys(step)[0];
    const stepValue = environment.fillString(Object.values(step)[0]);
    const newEnv = environment.clone();
    if (stepKey === 'env') {
        if (!isValidEnvValue(stepValue)) {
            throw Error(`Invalid env value: ${stepValue}`);
        }
        const keyPair = stepValue.split('=');
        ux.log(`${chalk.cyanBright('[env]')} ${stepValue}`);
        newEnv.setEnv(keyPair[0], keyPair[1]);
    } else if (stepKey === 'echo') {
        ux.log(`${chalk.cyanBright(`[echo]`)} ${Object.values(step)[0]}`);
        ux.log(stepValue);
    } else if (stepKey === 'job') {
        return executeJobByName(jobs, stepValue, newEnv);
    } else {
        return executeCommand(stepKey, stepValue, newEnv);
    }
    return newEnv;
}

async function executeCommand(stepKey: string, stepValue: string, environment: Environment): Promise<Environment> {
    const ux = getUX();
    const logger = getLogger();
    const command = stepKey === 'run' ? stepValue : [stepKey, stepValue].join(' ');
    ux.log(`${chalk.cyanBright(`[run] ${command}`)}`);
    const supportsEnvArg = (c) => [
        'pony:org:create',
        'pony:source:content:replace',
        'pony:source:push'
    ].some(it => c.includes(it));
    const {name: envFile} = tmp.fileSync({postfix: '.json'});
    environment.save(envFile);
    const commandWithEnv = supportsEnvArg(command)
        ? `${command} --ponyenv "${envFile}"` : command;
    logger.info('spawn', commandWithEnv);
    const cmd = spawn(commandWithEnv, [], {
        shell: true,
        stdio: ['inherit', 'inherit', 'inherit']
    });
    return new Promise((resolve, reject) => {
        cmd.on('close', (code) => {
            const newEnvironment = Environment.load(envFile);
            if (code) {
                reject(`Command failed: ${command}`);
            } else {
                resolve(newEnvironment);
            }
        });
    });
}

const secondsParser = (secs: number) => [
    Math.floor(secs / 3600), Math.floor(secs % 3600 / 60), Math.floor(secs % 3600 % 60)
];

function secondsFormatter(secs: number): string {
    const [h, m, s]: number[] = secondsParser(secs);
    const seconds = (h + m + s) === 0 ? '<1s' : s > 0 ? `${s}s` : '';
    return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${seconds}`;
}
