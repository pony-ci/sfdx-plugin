import { UX } from '@salesforce/command';
import { Org } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { ErrorResult, SuccessResult } from 'jsforce';
export declare type Record<T = AnyJson> = {
    Id?: SalesforceId;
} & T;
export declare type SalesforceId = string;
export interface FieldError {
    statusCode: string;
    message: string;
    fields: string[];
}
export declare const isInsertError: (value: unknown) => value is FieldError;
export declare const isErrorResult: (value: unknown) => value is ErrorResult;
export declare const isSuccessResult: (value: unknown) => value is SuccessResult;
export declare class SalesforceApi {
    private conn;
    private ux;
    private constructor();
    static create(org: Org, ux: UX): SalesforceApi;
    insert(sObjectName: string, records: Record[]): Promise<void>;
    query(query: string): Promise<Record[]>;
    delete(sObjectName: string, query: string): Promise<void>;
    private processErrorResults;
}
