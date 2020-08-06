import { FlagsConfig } from '@salesforce/command';
import { VarargsConfig } from '@salesforce/command/lib/sfdxCommand';
import PonyCommand from '../../../lib/PonyCommand';
export default class UserCreateCommand extends PonyCommand {
    static readonly description: string;
    static readonly requiresUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    protected static varargs: VarargsConfig;
    protected static strict: boolean;
    run(): Promise<void>;
}
