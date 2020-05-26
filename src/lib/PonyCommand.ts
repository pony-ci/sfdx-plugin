import {SfdxCommand, UX} from '@salesforce/command';
import {Logger} from '@salesforce/core';
import {EOL} from 'os';
import {EnvValue, JobMessage} from './jobs';
import {registerLogger, registerUX} from './pubsub';

const run = async (that: PonyCommand, ux: UX, logger: Logger, flags: any, thatRun) => {
    try {
        registerUX(ux);
        registerLogger(logger);
        return await thatRun.bind(that)();
    } catch (e) {
        throw preprocessError(e);
    }
};

export default abstract class PonyCommand extends SfdxCommand {

    constructor(arg1: any, arg2: any) {
        super(arg1, arg2);
        const thatRun = this.run;
        this.run = () => run(this, this.ux, this.logger, this.flags, thatRun);
    }

    protected get commandName(): string {
        return this.constructor.name.substr(0, this.constructor.name.length - 'Command'.length);
    }

    protected setEnv(key: string, value: EnvValue): void {
        this.sendMessage({
            env: {
                [key]: value
            }
        });
    }

    private sendMessage(message: JobMessage['pony']): void {
        if (process.send) {
            process.send({
                pony: message
            });
        }
    }
}

function preprocessError(errors: any): any {
    if (errors instanceof String || errors instanceof Error) {
        return errors;
    }
    if (errors.message) {
        return (errors.commandName ? `[${errors.commandName}] ` : '') + errors.message;
    }
    if (Array.isArray(errors)) {
        if (errors.length === 1) {
            return preprocessError(errors[0]);
        }
        if (errors.every(it => it.commandName && it.message)) {
            return errors.map(preprocessError).join(EOL + EOL);
        }
        return JSON.stringify(errors, null, 3);
    }
    return JSON.stringify(errors, null, 3);
}
