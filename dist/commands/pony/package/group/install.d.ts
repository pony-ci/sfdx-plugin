import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../../lib/PonyCommand';
export default class PackageGroupInstallCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    protected static supportsDevhubUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<void>;
}
