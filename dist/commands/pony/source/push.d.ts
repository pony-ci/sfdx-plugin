import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../../../lib/PonyCommand';
export default class SourcePushCommand extends PonyCommand {
    static readonly description: string;
    static readonly supportsUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    run(): Promise<void>;
}
