import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../../../../lib/PonyCommand';
export default class PackageGroupExportCommand extends PonyCommand {
    static readonly description: string;
    static readonly supportsUsername: boolean;
    static readonly supportsDevhubUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    run(): Promise<void>;
    private filterAndMapPackages;
    private packageToString;
}
