import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../lib/PonyCommand';
export default class PonyBaseCommand extends PonyCommand {
    static readonly theDescription: string;
    static readonly longDescription: string;
    static readonly help: string;
    static readonly: string;
    static readonly flagsConfig: FlagsConfig;
    run(): Promise<void>;
}
