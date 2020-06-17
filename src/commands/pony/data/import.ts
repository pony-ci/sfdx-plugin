import {flags, FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {isArray, isBoolean, isNumber, isString} from '@salesforce/ts-types';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {DataConfig} from '../../..';
import {describeSObject} from '../../../lib/data/sObject';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
import {Record, SalesforceApi} from '../../../lib/salesforceApi';
import {RelationshipField, SObjectName} from '../../../types/data-config.schema';
import {defaultRecordsDir, defaultSoqlDeleteDir} from './export';

const defaultImportChunkSize = 200;

const toRecordsFile = (recordsDir: string, sObjectName: string) =>
    path.join(recordsDir, `${sObjectName}.json`);

const toDeleteSoql = (soqlDeleteDir: string, sObjectName: string) => {
    const file = path.join(soqlDeleteDir, `${sObjectName}.soql`);
    if (fs.existsSync(file)) {
        return fs.readFileSync(file).toString();
    }
    return `SELECT Id FROM ${sObjectName}`;
};

export default class DataImportCommand extends PonyCommand {

    public static description: string = `import records`;

    protected static flagsConfig: FlagsConfig = {
        noprompt: flags.boolean({
            description: 'Allow data import to all instances without prompt.',
            default: false
        })
    };

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        if (!(await this.canContinue())) {
            this.ux.warn('Org import forbidden.');
            return;
        }
        if (!this.org) {
            throw Error('Org is required.');
        }
        const api = SalesforceApi.create(this.org, this.ux);
        const project = await PonyProject.load();
        const data = project.dataConfig;
        const recordsDir = data?.sObjects?.recordsDir || defaultRecordsDir;
        const importOrder = data?.sObjects?.import?.order || [];
        if (!importOrder.length) {
            this.ux.warn('Nothing to import.');
            return;
        }
        for (const sObjectName of importOrder) {
            const file = toRecordsFile(recordsDir, sObjectName);
            if (!fs.existsSync(file)) {
                throw Error(`File with records not found: ${file}`);
            }
        }
        await this.deleteRecords(api, data, importOrder);
        await this.importRecords(api, data, recordsDir, importOrder);
    }

    private async canContinue(): Promise<boolean> {
        const {noprompt} = this.flags;
        const isScratchOrg = await this.org?.getDevHubOrg() !== undefined;
        if (!noprompt && !isScratchOrg) {
            const continuePrompt = await this.ux.prompt('Import in a non scratch org. Allow import? [y/n]');
            return ['y', 'yes'].includes(continuePrompt.toLowerCase());
        }
        return true;
    }

    private async importRecords(
        api: SalesforceApi, data: DataConfig, recordsDir: string, importOrder: SObjectName[]
    ): Promise<void> {
        const {targetusername} = this.flags;
        const relationships = data?.sObjects?.import?.relationships || {};
        const chunkSize = data?.sObjects?.import?.chunkSize || defaultImportChunkSize;
        for (const sObjectName of importOrder) {
            const recordsContent = fs.readJSONSync(toRecordsFile(recordsDir, sObjectName));
            const records = recordsContent.records;
            const allCount = records.length;
            const describe = await describeSObject(sObjectName, targetusername, {ux: this.ux});
            if (!allCount) {
                this.ux.warn(`No ${describe.labelPlural} to import.`);
                continue;
            }
            this.ux.log(chalk.blueBright.bold(`Importing ${allCount} ${allCount === 1 ? describe.label : describe.labelPlural}`));
            await this.populateRelationships(api, records, relationships[sObjectName] || [], sObjectName);
            let importedCount = 0;
            let i = 0;
            this.ux.startSpinner(`0/${allCount}`);
            do {
                const importedRecords = await this.importRecordsChunk(api, records, i++, chunkSize, sObjectName);
                importedCount += importedRecords.length;
                this.ux.startSpinner(`${importedCount}/${allCount}`);
            } while (importedCount !== allCount);
            this.ux.stopSpinner();
        }
    }

    private async populateRelationships(
        api: SalesforceApi, records: Record[], relationshipFields: RelationshipField[], sObjectName: string
    ): Promise<void> {
        const {targetusername} = this.flags;
        const describe = await describeSObject(sObjectName, targetusername, {ux: this.ux});
        for (const relationshipField of relationshipFields) {
            const [relationshipName, fieldName]: string[] = relationshipField.split('.');
            const describeRelationship = describe.fields.find(it =>
                it.type === 'reference' &&
                it.relationshipName?.toLowerCase() === relationshipName.toLowerCase() &&
                isString(it.referenceTo?.[0])
            );
            if (!describeRelationship) {
                throw Error(`Couldn't find relationship ${relationshipName} on ${sObjectName}`);
            }
            const sourceSObject = describeRelationship.referenceTo?.[0];
            const sourceValues = this.getSourceFieldValues(records, relationshipName, fieldName);
            const sourceValuesStr = sourceValues.map(it => `'${it.replace(`'`, `\\'`)}'`).join(',');
            const recordTypeWhereClause = sourceSObject === 'RecordType' ? ` AND SObjectType = '${sObjectName}'` : '';
            const query = `SELECT Id,${fieldName} FROM ${sourceSObject} WHERE ${fieldName} IN (${sourceValuesStr})${recordTypeWhereClause}`;
            const relatedRecords = sourceValues.length ? await api.query(query) : [];
            for (const record of records) {
                const sourceValue = record[relationshipName]?.[fieldName];
                if (sourceValue) {
                    const relatedRecord = relatedRecords.find(it => it[fieldName] === sourceValue);
                    if (relatedRecord) {
                        record[describeRelationship.name] = relatedRecord.Id;
                    }
                }
            }
        }
    }

    private getSourceFieldValues(records: Record[], relationshipName: string, fieldName: string): string[] {
        const values: Set<string> = new Set();
        for (const record of records) {
            const value = record[relationshipName]?.[fieldName];
            if (isString(value)) {
                values.add(value);
            }
        }
        return [...values];
    }

    private async importRecordsChunk(
        api: SalesforceApi, allRecords: Record[], chunkIndex: number, chunkSize: number, sObjectName: string
    ): Promise<Record[]> {
        const records = allRecords.slice(chunkIndex * chunkSize, (chunkIndex * chunkSize) + chunkSize);
        if (!records.length) {
            return [];
        }
        const recordsToInsert = records.map(it => {
            const record = {};
            for (const [key, value] of Object.entries(it)) {
                if (isString(value) || isNumber(value) || isBoolean(value)) {
                    record[key] = value;
                }
            }
            return record;
        });
        await api.insert(sObjectName, recordsToInsert);
        return records;
    }

    private async deleteRecords(api: SalesforceApi, data: DataConfig, importOrder: SObjectName[]): Promise<void> {
        const {targetusername} = this.flags;
        const deleteBeforeImport = data.sObjects?.import?.deleteBeforeImport;
        const soqlDeleteDir = data?.sObjects?.import?.soqlDeleteDir || defaultSoqlDeleteDir;
        const deleteOrder = deleteBeforeImport === false
            ? [] : isArray(deleteBeforeImport) ? deleteBeforeImport : [...importOrder].reverse();
        for (const sObjectName of deleteOrder) {
            const describe = await describeSObject(sObjectName, targetusername, {ux: this.ux});
            this.ux.startSpinner(chalk.blueBright.bold(`Deleting ${describe.labelPlural}`));
            const deleteSoql = toDeleteSoql(soqlDeleteDir, sObjectName);
            let status = 'done';
            try {
                await api.delete(sObjectName, deleteSoql);
            } catch (e) {
                status = 'failed';
                throw e;
            } finally {
                this.ux.stopSpinner(status);
            }
        }
    }
}
