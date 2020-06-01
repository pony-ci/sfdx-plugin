import {UX} from '@salesforce/command';
import {Connection} from '@salesforce/core';
import {AnyJson, isAnyJson, isJsonMap, isPlainObject} from '@salesforce/ts-types';
import {ErrorResult, SuccessResult} from 'jsforce';
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

export async function insertRecords(
    conn: Connection, ux: UX, sObjectName: string, records: Record[]
): Promise<void> {
    conn.bulk.pollTimeout = 60000 * 10;
    const results = await conn.sobject(sObjectName).insert(records);
    let success = true;
    const errorRows: {row: number; statusCode: string; message: string; fields: string}[] = [];
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
                        statusCode: error,
                        message: '',
                        fields: ''
                    });
                }
            }
        }
    });
    if (errorRows.length) {
        ux.table(errorRows, Object.keys(errorRows[0]));
    }
    if (!success) {
        throw Error(`Insert failed.`);
    }
}

export async function queryRecords(
    conn: Connection, ux: UX, query: string
): Promise<Record[]> {
    const result = await conn.query(query);
    return (result.records || []) as Record[];
}

export async function deleteRecords(
    conn: Connection, ux: UX, sObjectName: string, query: string
): Promise<void> {
    const records = await queryRecords(conn, ux, query);
    const ids = records.map(it => it.Id) as string[];
    if (ids.length) {
        for (const chunkedIds of chunk(ids, 200)) {
            const results = await conn.sobject(sObjectName).del(chunkedIds);
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
                                statusCode: error,
                                message: '',
                                fields: ''
                            });
                        }
                    }
                }
            });
            if (errorRows.length) {
                ux.table(errorRows, Object.keys(errorRows[0]));
            }
            if (!success) {
                throw Error(`Delete failed.`);
            }
        }
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
