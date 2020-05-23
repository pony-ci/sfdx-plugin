import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {AnyJson, isArray} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {DescribeSObjectResult, Field} from 'jsforce/describe-result';
import {EOL} from 'os';
import path from 'path';
import {registerUX, sfdx} from '../../../../../..';
import PonyCommand from '../../../../../../lib/PonyCommand';

type DescribeSObjectResultByType = { [key: string]: DescribeSObjectResult };

export default class OrgCreateCommand extends PonyCommand {

    public static description: string = `create soql file for exporting records`;

    protected static flagsConfig: FlagsConfig = {
        sobjecttype: flags.string({
            char: 's',
            description: 'the API name of the object to create query',
            required: true
        }),
        noprompt: flags.boolean({
            char: 'p',
            description: 'no prompt to confirm overwrite',
            default: false
        }),
        excludeparentfields: flags.boolean({
            description: 'by default parent field names are added, e.g. "RecordType.Name"',
            default: false
        }),
        includenoncreateable: flags.boolean({
            description: 'by default only createable fields are added',
            default: false
        })
    };

    protected static requiresUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = false;
    protected static requiresProject: boolean = true;

    public async run(): Promise<AnyJson> {
        registerUX(this.ux);
        const query = await this.buildQuery();
        await this.writeQuery(query);
        return {query};
    }

    private async buildQuery(): Promise<string> {
        const {sobjecttype, excludeparentfields, includenoncreateable} = this.flags;
        const describeMap = await this.describeSObjectsByType();
        const described = describeMap[sobjecttype];
        const soqlFieldNames = this.filterCreateable(described.fields).map(it => it.name);
        if (!excludeparentfields) {
            soqlFieldNames.push(...getParentFieldNames(describeMap, sobjecttype, includenoncreateable));
        }
        const nameFieldNames = getNameFields(described).map(it => it.name);
        soqlFieldNames
            .sort((a, b) => a.localeCompare(b))
            .sort((a, b) => nameFieldNames.includes(a) === nameFieldNames.includes(b) ? 0 : a ? -1 : 1);

        const nameField = getNameFields(described).find(() => true);
        const orderByClause = nameField ? `${EOL}ORDER BY ${nameField.name}` : '';
        const fieldsClause = soqlFieldNames.map(it => `    ${it}`).join(`,${EOL}`);
        return `SELECT${EOL}${fieldsClause}${EOL}FROM ${sobjecttype}${orderByClause}${EOL}`;
    }

    private async writeQuery(query: string): Promise<void> {
        const {sobjecttype, noprompt} = this.flags;
        const dir = 'data/soql/import/';
        fs.ensureDirSync(dir);
        const file = path.join(dir, `${sobjecttype}.soql`);
        let writeFile = true;
        if (!noprompt && fs.existsSync(file)) {
            writeFile = await this.ux.confirm(`File already exists, overwrite ${file}?`);
        }
        if (writeFile) {
            this.ux.log(`Saving query to ${file}`);
            fs.writeFileSync(file, query);
        }
    }

    private async describeSObjectsByType(): Promise<DescribeSObjectResultByType> {
        this.ux.startSpinner('Describing SObject');
        const {sobjecttype, excludeparentfields, targetusername} = this.flags;
        const describeMap: DescribeSObjectResultByType = {};
        const described = describeMap[sobjecttype] = await this.describeSObject(sobjecttype, targetusername);
        if (!excludeparentfields) {
            const alreadyInProgress = new Set<string>();
            const describePromises: Promise<any>[] = [];
            for (const referenceField of this.filterCreateable(getReferenceFields(described))) {
                if (referenceField.referenceTo) {
                    for (const referenceTo of referenceField.referenceTo) {
                        if (!alreadyInProgress.has(referenceTo)) {
                            describePromises.push(this.describeSObject(referenceTo, targetusername));
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

    private async describeSObject(sObjectType: string, targetUsername: string): Promise<DescribeSObjectResult> {
        return sfdx.force.schema.sobject.describe({
            quiet: true,
            sobjecttype: sObjectType,
            targetusername: targetUsername
        });
    }

    private filterCreateable(fields: Field[]): Field[] {
        return this.flags.includenoncreateable ? fields : fields.filter(it => it.createable);
    }
}

const getNameFields = (result: DescribeSObjectResult) => result.fields.filter(it => it.nameField);

const getReferenceFields = (result: DescribeSObjectResult) => result.fields.filter(it =>
    it.type === 'reference' && isArray(it.referenceTo) && it.referenceTo.length && it.referenceTo[0]);

const getParentFieldNames = (describeMap: DescribeSObjectResultByType, sobjectType: string, nonCreateable: boolean) => {
    return getReferenceFields(describeMap[sobjectType])
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