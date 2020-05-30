import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import fs from 'fs-extra';
import path from 'path';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

const DEFAULT_RECORDS_DIR = 'data/sObjects/';
const DEFAULT_SOQL_DIR = 'data/soql/sObjects/';
const REVERSED_ORDER = 'reversedOrder';

const toQueryFile = (soqlDir: string, sObjectName: string) =>
    path.join(soqlDir, `${sObjectName}.soql`);

export default class DataExportCommand extends PonyCommand {

    public static description: string = ``;

    protected static flagsConfig: FlagsConfig = {};

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const project = await PonyProject.load();
        const data = await project.getDataConfig();
        const recordsDir = data?.sObjects?.recordsDir || DEFAULT_RECORDS_DIR;
        const soqlDir = data?.sObjects?.soqlDir || DEFAULT_SOQL_DIR;
        const exportOrder = data?.sObjects?.export?.order || REVERSED_ORDER;
        const importOrder = data?.sObjects?.import?.order || [];
        const sObjectNames = exportOrder === REVERSED_ORDER
            ? importOrder.reverse() : exportOrder;
        for (const sObjectName of sObjectNames) {
            const queryFile = toQueryFile(soqlDir, sObjectName);
            if (!fs.existsSync(queryFile)) {
                throw Error(`File with query not found: ${queryFile}`);
            }
        }
        for (const sObjectName of sObjectNames) {
            this.ux.log(`Exporting ${sObjectName}`);
            const {records} = await sfdx.force.data.tree.export({
                targetusername: this.flags.targetusername,
                outputdir: recordsDir,
                query: toQueryFile(soqlDir, sObjectName)
            });
            if (!records.length) {
                fs.writeJSONSync(path.join(recordsDir, `${sObjectName}.json`), {records});
            }
        }
    }
}
