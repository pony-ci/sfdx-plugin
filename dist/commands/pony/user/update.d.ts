import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../../../lib/PonyCommand';
export default class UserUpdateCommand extends PonyCommand {
    static readonly description: string;
    static readonly requiresUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    run(): Promise<void>;
}
