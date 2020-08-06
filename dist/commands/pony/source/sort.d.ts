import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../../../lib/PonyCommand';
export default class SourceSortCommand extends PonyCommand {
    static readonly description: string;
    static examples: string[];
    static readonly supportsUsername: boolean;
    static readonly supportsDevhubUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    protected strict: boolean;
    run(): Promise<void>;
    private sortComponentOrDir;
    private sortComponent;
}
