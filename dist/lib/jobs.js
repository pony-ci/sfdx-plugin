"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeStep = exports.executeJobByName = exports.Environment = exports.isIPCMessage = void 0;
const ts_types_1 = require("@salesforce/ts-types");
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const pubsub_1 = require("./pubsub");
exports.isIPCMessage = (value) => ts_types_1.isAnyJson(value) && ts_types_1.isJsonMap(value) && 'pony' in value && ts_types_1.isJsonMap(value.pony);
function isEnvValue(value) {
    return !value || ts_types_1.isString(value) || (ts_types_1.isArray(value) && value.every(ts_types_1.isString));
}
class Environment {
    constructor(variables, hrtime) {
        this.variables = variables;
        this.hrtime = hrtime;
    }
    static create(variables, hrtime) {
        return new Environment(variables, hrtime);
    }
    static parse(json) {
        const { variables, hrtime } = JSON.parse(json);
        return Environment.create(variables, hrtime);
    }
    static default() {
        return Environment.create({}, process.hrtime());
    }
    static stringify(env) {
        return JSON.stringify({ variables: env.variables, hrtime: env.hrtime });
    }
    getEnv(name) {
        return this.variables[name];
    }
    setEnv(name, value) {
        this.variables[name] = value;
        pubsub_1.getLogger().info(`set env [${name}]="${value}"`);
        this.sendMessage({
            env: {
                variables: this.variables
            }
        });
    }
    clone() {
        return Environment.parse(Environment.stringify(this));
    }
    fillString(str) {
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
            }
            else {
                throw Error(`Malformed: ${str}`);
            }
        }
        return result;
    }
    sendMessage(message) {
        if (process.send) {
            process.send({
                pony: message
            });
        }
    }
}
exports.Environment = Environment;
async function executeJobByName(jobs, name, env) {
    if (!jobs[name]) {
        throw Error(`Job not found: ${name}`);
    }
    const ux = await pubsub_1.getUX();
    const logger = await pubsub_1.getLogger();
    ux.log(chalk_1.default.cyanBright.bold(`=== [job] ${name}`));
    logger.info('run job', jobs[name], env);
    let currEnv = env;
    for (const step of jobs[name].steps || []) {
        const hrtimeStep = process.hrtime();
        const isJobStep = Object.keys(step)[0] === 'job';
        try {
            currEnv = await executeStep(jobs, step, currEnv);
        }
        catch (e) {
            throw e;
        }
        finally {
            if (!isJobStep) {
                ux.log(`time: ${secondsFormatter(process.hrtime(hrtimeStep)[0])} | total time: ${secondsFormatter(process.hrtime(env.hrtime)[0])}`);
            }
        }
    }
    return currEnv;
}
exports.executeJobByName = executeJobByName;
function isValidEnvValue(value) {
    return !(ts_types_1.isString(value) && !RegExp('^[a-zA-Z_]+=.*$').test(value));
}
async function executeStep(jobs, step, environment) {
    const ux = pubsub_1.getUX();
    const logger = pubsub_1.getLogger();
    logger.info('run step', step, environment);
    const stepKey = Object.keys(step)[0];
    const stepValue = environment.fillString(Object.values(step)[0]);
    const newEnv = environment.clone();
    if (stepKey === 'env') {
        if (!isValidEnvValue(stepValue)) {
            throw Error(`Invalid env value: ${stepValue}`);
        }
        const keyPair = stepValue.split('=');
        ux.log(`${chalk_1.default.cyanBright('[env]')} ${stepValue}`);
        newEnv.setEnv(keyPair[0], keyPair[1]);
    }
    else if (stepKey === 'echo') {
        ux.log(`${chalk_1.default.cyanBright(`[echo]`)} ${Object.values(step)[0]}`);
        ux.log(stepValue);
    }
    else if (stepKey === 'job') {
        return executeJobByName(jobs, stepValue, newEnv);
    }
    else {
        return executeCommand(stepKey, stepValue, newEnv);
    }
    return newEnv;
}
exports.executeStep = executeStep;
async function executeCommand(stepKey, stepValue, environment) {
    const ux = await pubsub_1.getUX();
    const logger = await pubsub_1.getLogger();
    const command = stepKey === 'run' ? stepValue : [stepKey, stepValue].join(' ');
    ux.log(`${chalk_1.default.cyanBright(`[run] ${command}`)}`);
    const supportsEnvArg = (c) => [
        'pony:org:create',
        'pony:source:content:replace',
        'pony:source:push'
    ].some(it => c.includes(it));
    const commandWithEnv = supportsEnvArg(command)
        ? `${command} --ponyenv '${Environment.stringify(environment)}'` : command;
    logger.info('spawn', commandWithEnv);
    const cmd = child_process_1.spawn(commandWithEnv, [], {
        shell: true,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    let newEnvironment = environment;
    cmd.on('message', async (message) => {
        if (exports.isIPCMessage(message)) {
            logger.info('ipc message', JSON.stringify(message, null, 4));
            const { env } = message.pony;
            newEnvironment = Environment.create(env.variables, newEnvironment.hrtime);
        }
    });
    return new Promise((resolve, reject) => {
        const error = (code) => `Command failed: ${command}`;
        cmd.on('close', (code) => code ? reject(error(code)) : resolve(newEnvironment));
    });
}
function secondsFormatter(secs) {
    const [h, m, s] = secondsParser(secs);
    const seconds = (h + m + s) === 0 ? '<1s' : s > 0 ? `${s}s` : '';
    return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${seconds}`;
}
const secondsParser = (secs) => [
    Math.floor(secs / 3600), Math.floor(secs % 3600 / 60), Math.floor(secs % 3600 % 60)
];
//# sourceMappingURL=jobs.js.map