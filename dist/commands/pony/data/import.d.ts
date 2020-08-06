import { FlagsConfig } from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../lib/PonyCommand';
export default class DataImportCommand extends PonyCommand {
    static description: string;
    protected static flagsConfig: FlagsConfig;
    protected static requiresUsername: boolean;
    protected static requiresProject: boolean;
    run(): Promise<void>;
    private canContinue;
    private importRecords;
    private populateRelationships;
    private getSourceFieldValues;
    private importRecordsChunk;
    private deleteRecords;
}
