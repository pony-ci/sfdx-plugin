import {flags, FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {Connection} from '@salesforce/core';
import {isArray, isBoolean, isNumber, isString} from '@salesforce/ts-types';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {DataConfig} from '../../..';
import {describeSObject} from '../../../lib/data/sObject';
import {deleteRecords, insertRecords, queryRecords, Record} from '../../../lib/force';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
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

    public static description: string = ``;

    protected static flagsConfig: FlagsConfig = {
        noprompt: flags.boolean({
            description: 'Allow data import to all instances without prompt.',
            default: false
        })
    };

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const conn = this.org?.getConnection();
        if (!conn) {
            throw Error(`Couldn't connect to ${this.org?.getUsername()}`);
        }
        const project = await PonyProject.load();
        const data = await project.getDataConfig();
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
        await this.deleteRecords(conn, data, importOrder);
        await this.importRecords(conn, data, recordsDir, importOrder);
    }

    private async importRecords(
        conn: Connection, data: DataConfig, recordsDir: string, importOrder: SObjectName[]
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
            await this.populateRelationships(conn, records, relationships[sObjectName] || [], sObjectName);
            let importedCount = 0;
            let i = 0;
            this.ux.startSpinner(`0/${allCount}`);
            do {
                const importedRecords = await this.importRecordsChunk(conn, records, i++, chunkSize, sObjectName);
                importedCount += importedRecords.length;
                this.ux.startSpinner(`${importedCount}/${allCount}`);
            } while (importedCount !== allCount);
            this.ux.stopSpinner();
        }
    }

    private async populateRelationships(
        conn: Connection, records: Record[], relationshipFields: RelationshipField[], sObjectName: string
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
            const sourceValuesStr = sourceValues.map(it => `'${it}'`).join(',');
            const query = `SELECT Id,${fieldName} FROM ${sourceSObject} WHERE ${fieldName} IN (${sourceValuesStr})`;
            const relatedRecords = sourceValues.length ? await queryRecords(conn, this.ux, query) : [];
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
        conn: Connection, allRecords: Record[], chunkIndex: number, chunkSize: number, sObjectName: string
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
        await insertRecords(conn, this.ux, sObjectName, recordsToInsert);
        return records;
    }

    private async deleteRecords(conn: Connection, data: DataConfig, importOrder: SObjectName[]): Promise<void> {
        const {noprompt, targetusername} = this.flags;
        const deleteBeforeImport = data.sObjects?.import?.deleteBeforeImport;
        const soqlDeleteDir = data?.sObjects?.import?.soqlDeleteDir || defaultSoqlDeleteDir;
        const deleteOrder = deleteBeforeImport === false
            ? [] : isArray(deleteBeforeImport) ? deleteBeforeImport : [...importOrder].reverse();
        const isScratchOrg = await this.org?.getDevHubOrg() !== undefined;
        let continuePrompt = 'y';
        if (!noprompt && !isScratchOrg && deleteOrder.length) {
            continuePrompt = await this.ux.prompt(
                'Target org is not a scratch org, allow records deletion before import (y/n)');
        }
        const canContinue = ['y', 'yes'].includes(continuePrompt.toLowerCase());
        if (!canContinue) {
            this.ux.warn('Org deletion forbidden.');
            return;
        }
        for (const sObjectName of deleteOrder) {
            await describeSObject(sObjectName, targetusername, {ux: this.ux});
        }
        for (const sObjectName of deleteOrder) {
            const describe = await describeSObject(sObjectName, targetusername, {ux: this.ux});
            this.ux.startSpinner(chalk.blueBright.bold(`Deleting ${describe.labelPlural}`));
            const deleteSoql = toDeleteSoql(soqlDeleteDir, sObjectName);
            await deleteRecords(conn, this.ux, sObjectName, deleteSoql);
            this.ux.stopSpinner();
        }
    }
}
