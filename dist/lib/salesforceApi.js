"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesforceApi = exports.isSuccessResult = exports.isErrorResult = exports.isInsertError = void 0;
const ts_types_1 = require("@salesforce/ts-types");
const general_1 = require("../type-guards/general");
exports.isInsertError = (value) => ts_types_1.isPlainObject(value) && 'statusCode' in value;
exports.isErrorResult = (value) => ts_types_1.isPlainObject(value) && general_1.hasProp(value, 'success') && value.success === false;
exports.isSuccessResult = (value) => ts_types_1.isAnyJson(value) && ts_types_1.isJsonMap(value) && value.success === true;
class SalesforceApi {
    constructor(conn, ux) {
        this.conn = conn;
        this.ux = ux;
        this.conn.bulk.pollTimeout = 60000 * 10;
    }
    static create(org, ux) {
        const conn = org === null || org === void 0 ? void 0 : org.getConnection();
        if (!conn) {
            throw Error(`Couldn't connect to ${org === null || org === void 0 ? void 0 : org.getUsername()}`);
        }
        return new SalesforceApi(conn, ux);
    }
    async insert(sObjectName, records) {
        const results = await this.conn.sobject(sObjectName).insert(records);
        if (!this.processErrorResults(results)) {
            throw Error(`Insert failed.`);
        }
    }
    async query(query) {
        let result = await this.conn.query(query);
        const records = (result.records || []);
        while (!result.done && result.nextRecordsUrl) {
            result = await this.conn.queryMore(result.nextRecordsUrl);
            records.push(...(result.records || []));
        }
        return records;
    }
    async delete(sObjectName, query) {
        const records = await this.query(query);
        const ids = records.map(it => it.Id);
        if (ids.length) {
            for (const chunkedIds of chunk(ids, 200)) {
                const results = await this.conn.sobject(sObjectName).del(chunkedIds);
                if (!this.processErrorResults(results)) {
                    throw Error(`Delete failed.`);
                }
            }
        }
    }
    processErrorResults(results) {
        let success = true;
        const errorRows = [];
        results.forEach((result, idx) => {
            if (exports.isErrorResult(result)) {
                success = false;
                for (const error of result.errors) {
                    if (exports.isInsertError(error)) {
                        errorRows.push({
                            row: idx,
                            statusCode: error.statusCode,
                            message: error.message,
                            fields: error.fields.join(', ')
                        });
                    }
                    else {
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
exports.SalesforceApi = SalesforceApi;
function chunk(array, size) {
    const chunked = [];
    let index = 0;
    while (index < array.length) {
        chunked.push(array.slice(index, size + index));
        index += size;
    }
    return chunked;
}
//# sourceMappingURL=salesforceApi.js.map