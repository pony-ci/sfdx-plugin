import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import fs from 'fs-extra';
import path from 'path';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

export const defaultRecordsDir = 'data/sObjects/';
export const defaultSoqlExportDir = 'scripts/soql/export/';
export const defaultSoqlDeleteDir = 'scripts/soql/delete/';
export const reversedOrder = 'reversedOrder';

const toQueryFile = (soqlExportDir: string, sObjectName: string) =>
    path.join(soqlExportDir, `${sObjectName}.soql`);

export default class DataExportCommand extends PonyCommand {

    public static description: string = `export records

Use 'sfdx force:data:soql:query:create' command to create a query for export.
`;

    protected static flagsConfig: FlagsConfig = {};

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const project = await PonyProject.load();
        const {sObjects = {}} = project.dataConfig;
        const recordsDir = sObjects.recordsDir || defaultRecordsDir;
        const soqlExportDir = sObjects.export?.soqlExportDir || defaultSoqlExportDir;
        const exportOrder = sObjects.export?.order || reversedOrder;
        const importOrder = sObjects?.import?.order || [];
        const sObjectNames = exportOrder === reversedOrder
            ? reverseArray(importOrder) : exportOrder;
        for (const sObjectName of sObjectNames) {
            const queryFile = toQueryFile(soqlExportDir, sObjectName);
            if (!fs.existsSync(queryFile)) {
                throw Error(`File with query not found: ${queryFile}`);
            }
        }
        for (const sObjectName of sObjectNames) {
            this.ux.log(`Exporting ${sObjectName}`);
            const {records} = await sfdx.force.data.tree.export({
                targetusername: this.flags.targetusername,
                outputdir: recordsDir,
                query: toQueryFile(soqlExportDir, sObjectName)
            });
            if (!records.length) {
                fs.writeJSONSync(path.join(recordsDir, `${sObjectName}.json`), {records});
            }
        }
    }
}

function reverseArray<T>(arr: T[]): T[] {
    const result: T[] = [];
    for (let i = arr.length - 1; i >= 0; --i) {
        result.push(arr[i]);
    }
    return result;
}
