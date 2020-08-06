import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../lib/PonyCommand';
export default class GroupAssignCommand extends PonyCommand {
    static description: string;
    static examples: string[];
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    protected static supportsDevhubUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<void>;
    private createGroupMemberRecord;
    private getGroupRecords;
    private getUserOrGroupId;
}
