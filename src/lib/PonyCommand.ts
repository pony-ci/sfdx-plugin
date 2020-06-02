import {IConfig} from '@oclif/config';
import {SfdxCommand, UX} from '@salesforce/command';
import {Logger} from '@salesforce/core';
import {isArray, isPlainObject} from '@salesforce/ts-types';
import {EOL} from 'os';
import {hasProp} from '../type-guards/general';
import {registerLogger, registerUX} from './pubsub';

const run = async (that: PonyCommand, ux: UX, logger: Logger, thatRun) => {
    try {
        registerUX(ux);
        registerLogger(logger);
        return await thatRun.bind(that)();
    } catch (e) {
        throw preprocessError(e);
    }
};

export default abstract class PonyCommand extends SfdxCommand {

    constructor(arg1: string[], arg2: IConfig) {
        super(arg1, arg2);
        const thatRun = this.run;
        this.run = () => run(this, this.ux, this.logger, thatRun);
    }

    protected get commandName(): string {
        return this.constructor.name.substr(0, this.constructor.name.length - 'Command'.length);
    }
}

function preprocessError(errors: unknown): unknown {
    if (errors instanceof String || errors instanceof Error) {
        return errors;
    }
    if (isPlainObject(errors) && hasProp(errors, 'commandName') && hasProp(errors, 'message')) {
        return (errors.commandName ? `[${errors.commandName}] ` : '') + errors.message;
    }
    if (isArray(errors)) {
        if (errors.length === 1) {
            return preprocessError(errors[0]);
        }
        if (errors.every(it => isPlainObject(it) && 'commandName' in it && 'message' in it)) {
            return errors.map(preprocessError).join(EOL + EOL);
        }
        return JSON.stringify(errors, null, 4);
    }
    console.log('1');
    return JSON.stringify(errors, null, 4);
}
