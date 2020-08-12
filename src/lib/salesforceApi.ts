import {UX} from '@salesforce/command';
import {Connection, Org} from '@salesforce/core';
import {AnyJson, isAnyJson, isJsonMap, isPlainObject} from '@salesforce/ts-types';
import {ErrorResult, RecordResult, SuccessResult} from 'jsforce';
import {hasProp} from '../type-guards/general';

export type Record<T = AnyJson> = { Id?: SalesforceId } & T;
export type SalesforceId = string;

export interface FieldError {
    statusCode: string;
    message: string;
    fields: string[];
}

export const isInsertError = (value: unknown): value is FieldError =>
    isPlainObject(value) && 'statusCode' in value;

export const isErrorResult = (value: unknown): value is ErrorResult =>
    isPlainObject(value) && hasProp(value, 'success') && value.success === false;

export const isSuccessResult = (value: unknown): value is SuccessResult =>
    isAnyJson(value) && isJsonMap(value) && value.success === true;

export class SalesforceApi {
    private conn: Connection;
    private ux: UX;

    private constructor(conn: Connection, ux: UX) {
        this.conn = conn;
        this.ux = ux;
        this.conn.bulk.pollTimeout = 60000 * 10;
    }

    public static create(org: Org, ux: UX): SalesforceApi {
        const conn = org?.getConnection();
        if (!conn) {
            throw Error(`Couldn't connect to ${org?.getUsername()}`);
        }
        return new SalesforceApi(conn, ux);
    }

    public async insert(sObjectName: string, records: Record[]): Promise<void> {
        const results = await this.conn.sobject(sObjectName).insert(records);
        if (!this.processErrorResults(results)) {
            throw Error(`Insert failed.`);
        }
    }

    public async query(query: string): Promise<Record[]> {
        // tslint:disable-next-line:await-promise
        let result = await this.conn.query(query);
        const records = (result.records || []) as Record[];
        while (!result.done && result.nextRecordsUrl) {
            result = await this.conn.queryMore(result.nextRecordsUrl);
            records.push(...(result.records || []) as Record[]);
        }
        return records;
    }

    public async destroy(sObjectName: string, query: string): Promise<void> {
        const records = await this.query(query);
        const ids = records.map(it => it.Id) as string[];
        if (ids.length) {
            for (const chunkedIds of chunk(ids, 200)) {
                const results = await this.conn.sobject(sObjectName).del(chunkedIds);
                if (!this.processErrorResults(results)) {
                    throw Error(`Delete failed.`);
                }
            }
        }
    }

    private processErrorResults(results: RecordResult[]): boolean {
        let success = true;
        const errorRows: { row: number; statusCode: string; message: string; fields: string }[] = [];
        results.forEach((result, idx) => {
            if (isErrorResult(result)) {
                success = false;
                for (const error of result.errors) {
                    if (isInsertError(error)) {
                        errorRows.push({
                            row: idx,
                            statusCode: error.statusCode,
                            message: error.message,
                            fields: error.fields.join(', ')
                        });
                    } else {
                        errorRows.push({
                            row: idx,
                            statusCode: JSON.stringify(error),
                            message: '',
                            fields: ''
                        });
                    }
                }
            }
        });
        if (errorRows.length) {
            this.ux.table(errorRows, Object.keys(errorRows[0]));
        }
        return success;
    }
}

function chunk<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
}
