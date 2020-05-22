import {SfdxCommand} from '@salesforce/command';
import {EOL} from 'os';

const run = async (that, thatRun) => {
    try {
        return await thatRun.bind(that)();
    } catch (e) {
        throw preprocessError(e);
    }
};

export default abstract class PonyCommand extends SfdxCommand {

    constructor(arg1: any, arg2: any) {
        super(arg1, arg2);
        const thatRun = this.run;
        this.run = () => run(this, thatRun);
    }

    protected get commandName(): string {
        return this.constructor.name.substr(0, this.constructor.name.length - 'Command'.length);
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
