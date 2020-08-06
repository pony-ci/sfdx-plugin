import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../lib/PonyCommand';
export declare const defaultRecordsDir = "data/sObjects/";
export declare const defaultSoqlExportDir = "scripts/soql/export/";
export declare const defaultSoqlDeleteDir = "scripts/soql/delete/";
export declare const reversedOrder = "reversedOrder";
export default class DataExportCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<void>;
}
