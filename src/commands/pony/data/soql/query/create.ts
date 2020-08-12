import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {AnyJson, Dictionary, isArray} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {DescribeSObjectResult, Field} from 'jsforce/describe-result';
import {EOL} from 'os';
import path from 'path';
import {describeSObject} from '../../../../../lib/data/sObject';
import PonyCommand from '../../../../../lib/PonyCommand';
import PonyProject from '../../../../../lib/PonyProject';
import {defaultSoqlExportDir} from '../../export';

type DescribeSObjectResultByType = { [key: string]: DescribeSObjectResult };

const getNameFields = (result: DescribeSObjectResult) => result.fields.filter(it => it.nameField);

const getReferenceFields = (result: DescribeSObjectResult) => result.fields.filter(it =>
    it.type === 'reference' && isArray(it.referenceTo) && it.referenceTo.length && it.referenceTo[0]);

const getParentFieldNames = (describeMap: DescribeSObjectResultByType, sObjectType: string, nonCreateable: boolean) => {
    return getReferenceFields(describeMap[sObjectType])
        .filter(it => it.relationshipName && (it.createable || nonCreateable))
        .reduce((arr: string[], it) => {
            if (it.referenceTo) {
                for (const referenceTo of it.referenceTo) {
                    getNameFields(describeMap[it.referenceTo[0]])
                        .map(field => `${it.relationshipName}.${field.name}`)
                        .forEach(name => arr.push(name));
                }
            }
            return arr;
        }, []);
};

export default class DataExportSoqlQueryCreateCommand extends PonyCommand {

    public static description: string = `create file with soql query for exporting records`;

    protected static flagsConfig: FlagsConfig = {
        sobjecttype: flags.string({
            char: 's',
            description: 'the API name of the object to create query, (default: all sobjects defined in config)',
            required: false
        }),
        noprompt: flags.boolean({
            char: 'p',
            description: 'no prompt to confirm overwrite',
            default: false,
            required: false
        }),
        excludeparentfields: flags.boolean({
            description: 'exclude parent name fields, e.g. "RecordType.Name"',
            default: false,
            required: false
        }),
        includenoncreateable: flags.boolean({
            description: 'include only createable fields are added',
            default: false,
            required: false
        })
    };

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<AnyJson> {
        const project = await PonyProject.load();
        const data = project.dataConfig;
        const soqlExportDir = data?.sObjects?.export?.soqlExportDir || defaultSoqlExportDir;
        const exportOrder = data.sObjects?.export?.order;
        const sObjectTypes = this.flags.sobjecttype
            ? [this.flags.sobjecttype]
            : isArray(exportOrder) ? exportOrder : ([...data.sObjects?.import?.order || []]).reverse();
        const queries: Dictionary<string> = {};
        for (const sObjectType of sObjectTypes) {
            const query = await this.buildQuery(sObjectType);
            await this.writeQuery(sObjectType, query, soqlExportDir);
            queries[sObjectType] = query;
        }
        return queries;
    }

    private async buildQuery(sObjectType: string): Promise<string> {
        const {excludeparentfields, includenoncreateable} = this.flags;
        const describeMap = await this.describeSObjectsByType(sObjectType);
        const described = describeMap[sObjectType];
        const soqlFieldNames = this.filterCreateable(described.fields).map(it => it.name);
        if (!excludeparentfields) {
            soqlFieldNames.push(...getParentFieldNames(describeMap, sObjectType, includenoncreateable));
        }
        const nameFieldNames = getNameFields(described).map(it => it.name);
        soqlFieldNames
            .sort((a, b) => a.localeCompare(b))
            .sort((a, b) => nameFieldNames.includes(a) === nameFieldNames.includes(b) ? 0 : a ? -1 : 1);

        const nameField = getNameFields(described).find(() => true);
        const orderByClause = nameField ? `${EOL}ORDER BY ${nameField.name}` : '';
        const fieldsClause = [...new Set(soqlFieldNames)].map(it => `    ${it}`).join(`,${EOL}`);
        return `SELECT${EOL}${fieldsClause}${EOL}FROM ${sObjectType}${orderByClause}${EOL}`;
    }

    private async writeQuery(sObjectType: string, query: string, soqlExportDir: string): Promise<void> {
        const {noprompt} = this.flags;
        fs.ensureDirSync(soqlExportDir);
        const file = path.join(soqlExportDir, `${sObjectType}.soql`);
        let writeFile = true;
        if (!noprompt && fs.existsSync(file)) {
            writeFile = await this.ux.confirm(`File already exists, overwrite ${file}?`);
        }
        if (writeFile) {
            this.ux.log(`Saving query to ${file}`);
            fs.writeFileSync(file, query);
        }
    }

    private async describeSObjectsByType(sObjectType: string): Promise<DescribeSObjectResultByType> {
        const {excludeparentfields, targetusername} = this.flags;
        const describeMap: DescribeSObjectResultByType = {};
        const described = describeMap[sObjectType] = await describeSObject(sObjectType, targetusername, {ux: this.ux});
        if (!excludeparentfields) {
            const alreadyInProgress = new Set<string>();
            const describePromises: Promise<DescribeSObjectResult>[] = [];
            for (const referenceField of this.filterCreateable(getReferenceFields(described))) {
                if (referenceField.referenceTo) {
                    for (const referenceTo of referenceField.referenceTo) {
                        if (!alreadyInProgress.has(referenceTo)) {
                            describePromises.push(describeSObject(referenceTo, targetusername, {ux: this.ux}));
                            alreadyInProgress.add(referenceTo);
                        }
                    }
                }
            }
            for (const result of await Promise.all(describePromises)) {
                describeMap[result.name] = result;
            }
        }
        this.ux.stopSpinner();
        return describeMap;
    }

    private filterCreateable(fields: Field[]): Field[] {
        return this.flags.includenoncreateable ? fields : fields.filter(it => it.createable);
    }
}
