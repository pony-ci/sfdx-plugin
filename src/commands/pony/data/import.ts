import {UX} from '@salesforce/command';
import {flags, FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {Connection} from '@salesforce/core';
import {isArray, isBoolean, isNumber, isString, JsonMap} from '@salesforce/ts-types';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import {DataConfig, Relationship, sfdx, SObjectNames} from '../../..';
import {describeSObject} from '../../../lib/data/sObject';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
import {defaultRecordsDir, defaultSoqlDeleteDir} from './export';

const defaultImportChunkSize = 200;

const toRecordsFile = (recordsDir: string, sObjectName: string) =>
    path.join(recordsDir, `${sObjectName}.json`);

const toDeleteSoql = (soqlDeleteDir: string, sObjectName: string) => {
    const file = path.join(soqlDeleteDir, `${sObjectName}.soql`);
    if (fs.existsSync(file)) {
        return fs.readdirSync(file).toString();
    }
    return `SELECT Id FROM ${sObjectName}`;
};

export type Records = Record[];
export type Record = JsonMap;

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
        conn: Connection, data: DataConfig, recordsDir: string, importOrder: SObjectNames
    ): Promise<void> {
        const relationships = data?.sObjects?.import?.relationships || [];
        const chunkSize = data?.sObjects?.import?.chunkSize || defaultImportChunkSize;
        for (const sObjectName of importOrder) {
            const recordsContent = fs.readJSONSync(toRecordsFile(recordsDir, sObjectName));
            const records: Records = recordsContent.records;
            const allCount = records.length;
            this.ux.log(chalk.blueBright.bold(`Importing ${allCount} ${sObjectName}`));
            await this.populateRelationships(
                records,
                relationships.filter(it => it.sObject.toLowerCase() === sObjectName.toLowerCase()),
                sObjectName
            );
            let importedCount = 0;
            let i = 0;
            this.ux.startSpinner(`0 imported`);
            do {
                const importedRecords = await this.importRecordsChunk(conn, records, i++, chunkSize, sObjectName);
                importedCount += importedRecords.length;
                this.ux.startSpinner(`imported ${importedCount}`);
            } while (importedCount !== allCount);
            this.ux.stopSpinner();
        }
    }

    private async populateRelationships(
        records: Records, relationships: Relationship[], sObjectName: string
    ): Promise<void> {
        const {targetusername} = this.flags;
        const describe = await describeSObject(sObjectName, targetusername, {ux: this.ux});
        for (const {fieldMappings} of relationships) {
            for (const {relationshipName, fieldName} of fieldMappings) {
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
                const {records: relatedRecords} = await sfdx.force.data.soql.query({
                    quiet: true,
                    query,
                    targetusername
                });
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
    }

    private getSourceFieldValues(records: Records, relationshipName: string, fieldName: string): string[] {
        const values: string[] = [];
        for (const record of records) {
            const value = record[relationshipName]?.[fieldName];
            if (isString(value)) {
                values.push(value);
            }
        }
        return values;
    }

    private async importRecordsChunk(
        conn: Connection, allRecords: Records, chunkIndex: number, chunkSize: number, sObjectName: string
    ): Promise<Records> {
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

    private async deleteRecords(conn: Connection, data: DataConfig, importOrder: SObjectNames): Promise<void> {
        const {noprompt} = this.flags;
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
            this.ux.startSpinner(`Deleting ${sObjectName} records.`);
            const deleteSoql = toDeleteSoql(soqlDeleteDir, sObjectName);
            await destroyRecords(conn, this.ux, sObjectName, deleteSoql);
            this.ux.stopSpinner();
        }
    }
}

export async function destroyRecords(
    conn: Connection, ux: UX, sObjectName: string, query: string
): Promise<void> {
    const records = await queryRecords(conn, ux, query);
    const ids = records.map(it => it.Id) as string[];
    await deleteRecords(conn, ux, sObjectName, ids);
}

export async function queryRecords(
    conn: Connection, ux: UX, query: string
): Promise<Record[]> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        conn.query(query, (err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result.records || []);
        });
    });
}

export async function deleteRecords(
    conn: Connection, ux: UX, sObjectName: string, ids: string[]
): Promise<void> {
    return new Promise((resolve, reject) => {
        conn.sobject(sObjectName).del(ids, (err, result) => {
            if (err) {
                reject(err);
            }
            let success = true;
            result.forEach(it => {
                if ('errors' in it && it.errors.length) {
                    ux.log(it.errors.join(', '));
                    success = false;
                }
            });
            if (!success) {
                reject(`Delete failed.`);
            }
            resolve();
        });
    });
}

export async function insertRecords(
    conn: Connection, ux: UX, sObjectName: string, records: Record[]
): Promise<void> {
    conn.bulk.pollTimeout = 60000 * 10;
    return new Promise((resolve, reject) => {
        // @ts-ignore
        conn.sobject(sObjectName).insert(records, {allOrNone: true}, (err, result) => {
            if (err) {
                reject(err);
            }
            let success = true;
            result.forEach(it => {
                if ('errors' in it && it.errors.length) {
                    ux.log(it.errors.join(', '));
                    success = false;
                }
            });
            if (!success) {
                reject(`Insert failed.`);
            }
            resolve();
        });
    });
}
