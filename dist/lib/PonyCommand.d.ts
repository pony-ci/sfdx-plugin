import { IConfig } from '@oclif/config';
import { SfdxCommand } from '@salesforce/command';
export default abstract class PonyCommand extends SfdxCommand {
    constructor(arg1: string[], arg2: IConfig);
    protected get commandName(): string;
}
