"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sfdxFlags_1 = require("@salesforce/command/lib/sfdxFlags");
const ts_types_1 = require("@salesforce/ts-types");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const sObject_1 = require("../../../lib/data/sObject");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
const salesforceApi_1 = require("../../../lib/salesforceApi");
const export_1 = require("./export");
const defaultImportChunkSize = 200;
const toRecordsFile = (recordsDir, sObjectName) => path_1.default.join(recordsDir, `${sObjectName}.json`);
const toDeleteSoql = (soqlDeleteDir, sObjectName) => {
    const file = path_1.default.join(soqlDeleteDir, `${sObjectName}.soql`);
    if (fs_extra_1.default.existsSync(file)) {
        return fs_extra_1.default.readFileSync(file).toString();
    }
    return `SELECT Id FROM ${sObjectName}`;
};
let DataImportCommand = /** @class */ (() => {
    class DataImportCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b, _c;
            if (!(await this.canContinue())) {
                this.ux.warn('Org import forbidden.');
                return;
            }
            if (!this.org) {
                throw Error('Org is required.');
            }
            const api = salesforceApi_1.SalesforceApi.create(this.org, this.ux);
            const project = await PonyProject_1.default.load();
            const data = project.dataConfig;
            const recordsDir = ((_a = data === null || data === void 0 ? void 0 : data.sObjects) === null || _a === void 0 ? void 0 : _a.recordsDir) || export_1.defaultRecordsDir;
            const importOrder = ((_c = (_b = data === null || data === void 0 ? void 0 : data.sObjects) === null || _b === void 0 ? void 0 : _b.import) === null || _c === void 0 ? void 0 : _c.order) || [];
            if (!importOrder.length) {
                this.ux.warn('Nothing to import.');
                return;
            }
            for (const sObjectName of importOrder) {
                const file = toRecordsFile(recordsDir, sObjectName);
                if (!fs_extra_1.default.existsSync(file)) {
                    throw Error(`File with records not found: ${file}`);
                }
            }
            await this.deleteRecords(api, data, importOrder);
            await this.importRecords(api, data, recordsDir, importOrder);
        }
        async canContinue() {
            var _a;
            const { noprompt } = this.flags;
            const isScratchOrg = await ((_a = this.org) === null || _a === void 0 ? void 0 : _a.getDevHubOrg()) !== undefined;
            if (!noprompt && !isScratchOrg) {
                const continuePrompt = await this.ux.prompt('Import in a non scratch org. Allow import? [y/n]');
                return ['y', 'yes'].includes(continuePrompt.toLowerCase());
            }
            return true;
        }
        async importRecords(api, data, recordsDir, importOrder) {
            var _a, _b, _c, _d;
            const { targetusername } = this.flags;
            const relationships = ((_b = (_a = data === null || data === void 0 ? void 0 : data.sObjects) === null || _a === void 0 ? void 0 : _a.import) === null || _b === void 0 ? void 0 : _b.relationships) || {};
            const chunkSize = ((_d = (_c = data === null || data === void 0 ? void 0 : data.sObjects) === null || _c === void 0 ? void 0 : _c.import) === null || _d === void 0 ? void 0 : _d.chunkSize) || defaultImportChunkSize;
            for (const sObjectName of importOrder) {
                const recordsContent = fs_extra_1.default.readJSONSync(toRecordsFile(recordsDir, sObjectName));
                const records = recordsContent.records;
                const allCount = records.length;
                const describe = await sObject_1.describeSObject(sObjectName, targetusername, { ux: this.ux });
                if (!allCount) {
                    this.ux.warn(`No ${describe.labelPlural} to import.`);
                    continue;
                }
                this.ux.log(chalk_1.default.blueBright.bold(`Importing ${allCount} ${allCount === 1 ? describe.label : describe.labelPlural}`));
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
        async populateRelationships(api, records, relationshipFields, sObjectName) {
            var _a, _b;
            const { targetusername } = this.flags;
            const describe = await sObject_1.describeSObject(sObjectName, targetusername, { ux: this.ux });
            for (const relationshipField of relationshipFields) {
                const [relationshipName, fieldName] = relationshipField.split('.');
                const describeRelationship = describe.fields.find(it => {
                    var _a, _b;
                    return it.type === 'reference' &&
                        ((_a = it.relationshipName) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === relationshipName.toLowerCase() &&
                        ts_types_1.isString((_b = it.referenceTo) === null || _b === void 0 ? void 0 : _b[0]);
                });
                if (!describeRelationship) {
                    throw Error(`Couldn't find relationship ${relationshipName} on ${sObjectName}`);
                }
                const sourceSObject = (_a = describeRelationship.referenceTo) === null || _a === void 0 ? void 0 : _a[0];
                const sourceValues = this.getSourceFieldValues(records, relationshipName, fieldName);
                const sourceValuesStr = sourceValues.map(it => `'${it.replace(`'`, `\\'`)}'`).join(',');
                const recordTypeWhereClause = sourceSObject === 'RecordType' ? ` AND SObjectType = '${sObjectName}'` : '';
                const query = `SELECT Id,${fieldName} FROM ${sourceSObject} WHERE ${fieldName} IN (${sourceValuesStr})${recordTypeWhereClause}`;
                const relatedRecords = sourceValues.length ? await api.query(query) : [];
                for (const record of records) {
                    const sourceValue = (_b = record[relationshipName]) === null || _b === void 0 ? void 0 : _b[fieldName];
                    if (sourceValue) {
                        const relatedRecord = relatedRecords.find(it => it[fieldName] === sourceValue);
                        if (relatedRecord) {
                            record[describeRelationship.name] = relatedRecord.Id;
                        }
                    }
                }
            }
        }
        getSourceFieldValues(records, relationshipName, fieldName) {
            var _a;
            const values = new Set();
            for (const record of records) {
                const value = (_a = record[relationshipName]) === null || _a === void 0 ? void 0 : _a[fieldName];
                if (ts_types_1.isString(value)) {
                    values.add(value);
                }
            }
            return [...values];
        }
        async importRecordsChunk(api, allRecords, chunkIndex, chunkSize, sObjectName) {
            const records = allRecords.slice(chunkIndex * chunkSize, (chunkIndex * chunkSize) + chunkSize);
            if (!records.length) {
                return [];
            }
            const recordsToInsert = records.map(it => {
                const record = {};
                for (const [key, value] of Object.entries(it)) {
                    if (ts_types_1.isString(value) || ts_types_1.isNumber(value) || ts_types_1.isBoolean(value)) {
                        record[key] = value;
                    }
                }
                return record;
            });
            await api.insert(sObjectName, recordsToInsert);
            return records;
        }
        async deleteRecords(api, data, importOrder) {
            var _a, _b, _c, _d;
            const { targetusername } = this.flags;
            const deleteBeforeImport = (_b = (_a = data.sObjects) === null || _a === void 0 ? void 0 : _a.import) === null || _b === void 0 ? void 0 : _b.deleteBeforeImport;
            const soqlDeleteDir = ((_d = (_c = data === null || data === void 0 ? void 0 : data.sObjects) === null || _c === void 0 ? void 0 : _c.import) === null || _d === void 0 ? void 0 : _d.soqlDeleteDir) || export_1.defaultSoqlDeleteDir;
            const deleteOrder = deleteBeforeImport === false
                ? [] : ts_types_1.isArray(deleteBeforeImport) ? deleteBeforeImport : [...importOrder].reverse();
            for (const sObjectName of deleteOrder) {
                const describe = await sObject_1.describeSObject(sObjectName, targetusername, { ux: this.ux });
                this.ux.startSpinner(chalk_1.default.blueBright.bold(`Deleting ${describe.labelPlural}`));
                const deleteSoql = toDeleteSoql(soqlDeleteDir, sObjectName);
                let status = 'done';
                try {
                    await api.delete(sObjectName, deleteSoql);
                }
                catch (e) {
                    status = 'failed';
                    throw e;
                }
                finally {
                    this.ux.stopSpinner(status);
                }
            }
        }
    }
    DataImportCommand.description = `import records`;
    DataImportCommand.flagsConfig = {
        noprompt: sfdxFlags_1.flags.boolean({
            description: 'Allow data import to all instances without prompt.',
            default: false
        })
    };
    DataImportCommand.requiresUsername = true;
    DataImportCommand.requiresProject = true;
    return DataImportCommand;
})();
exports.default = DataImportCommand;
//# sourceMappingURL=import.js.map