import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import { AnyJson } from '@salesforce/ts-types';
import PonyCommand from '../../../../../lib/PonyCommand';
export default class DataExportSoqlQueryCreateCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<AnyJson>;
    private buildQuery;
    private writeQuery;
    private describeSObjectsByType;
    private filterCreateable;
}
