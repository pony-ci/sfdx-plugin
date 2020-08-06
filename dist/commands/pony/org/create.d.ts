import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import { AnyJson } from '@salesforce/ts-types';
import PonyCommand from '../../../lib/PonyCommand';
export default class OrgCreateCommand extends PonyCommand {
    static description: string;
    static readonly varargs: boolean;
    protected static flagsConfig: FlagsConfig;
    protected static supportsUsername: boolean;
    protected static supportsDevhubUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<AnyJson>;
    private tryGetExistingOrg;
    private resolveAlias;
    private getOptions;
    private getOrgCreateArgs;
    private getUsername;
}
