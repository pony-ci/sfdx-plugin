import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../../lib/PonyCommand';
export default class ProfileAssignCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    run(): Promise<void>;
    private getProfileId;
    private assignProfile;
    private deactivateAndLogoutAssigner;
    private getAssignerUsername;
    private getTargetUsername;
}
