import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../../lib/PonyCommand';
export default class SourceContentReplaceCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresProject: boolean;
    run(): Promise<void>;
    private replaceOrgWideEmailAddress;
    private replaceInnerText;
}
