import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../lib/PonyCommand';
interface ConnectedApp {
    label: string;
    fullName: string;
    oauthConfig?: {
        callbackUrl?: string;
        scopes?: string[];
        certificate?: string;
    };
    contactEmail: string;
}
export default class ConnectedAppDeployCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static supportsUsername: boolean;
    run(): Promise<ConnectedApp>;
}
export {};
