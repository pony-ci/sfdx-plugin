"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const ts_types_1 = require("@salesforce/ts-types");
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const sObject_1 = require("../../../../../lib/data/sObject");
const PonyCommand_1 = __importDefault(require("../../../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../../../lib/PonyProject"));
const export_1 = require("../../export");
let DataExportSoqlQueryCreateCommand = /** @class */ (() => {
    class DataExportSoqlQueryCreateCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b, _c, _d, _e, _f;
            const project = await PonyProject_1.default.load();
            const data = project.dataConfig;
            const soqlExportDir = ((_b = (_a = data === null || data === void 0 ? void 0 : data.sObjects) === null || _a === void 0 ? void 0 : _a.export) === null || _b === void 0 ? void 0 : _b.soqlExportDir) || export_1.defaultSoqlExportDir;
            const exportOrder = (_d = (_c = data.sObjects) === null || _c === void 0 ? void 0 : _c.export) === null || _d === void 0 ? void 0 : _d.order;
            const sObjectTypes = this.flags.sobjecttype
                ? [this.flags.sobjecttype]
                : ts_types_1.isArray(exportOrder) ? exportOrder : ([...((_f = (_e = data.sObjects) === null || _e === void 0 ? void 0 : _e.import) === null || _f === void 0 ? void 0 : _f.order) || []]).reverse();
            const queries = {};
            for (const sObjectType of sObjectTypes) {
                const query = await this.buildQuery(sObjectType);
                await this.writeQuery(sObjectType, query, soqlExportDir);
                queries[sObjectType] = query;
            }
            return queries;
        }
        async buildQuery(sObjectType) {
            const { excludeparentfields, includenoncreateable } = this.flags;
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
            const orderByClause = nameField ? `${os_1.EOL}ORDER BY ${nameField.name}` : '';
            const fieldsClause = [...new Set(soqlFieldNames)].map(it => `    ${it}`).join(`,${os_1.EOL}`);
            return `SELECT${os_1.EOL}${fieldsClause}${os_1.EOL}FROM ${sObjectType}${orderByClause}${os_1.EOL}`;
        }
        async writeQuery(sObjectType, query, soqlExportDir) {
            const { noprompt } = this.flags;
            fs_extra_1.default.ensureDirSync(soqlExportDir);
            const file = path_1.default.join(soqlExportDir, `${sObjectType}.soql`);
            let writeFile = true;
            if (!noprompt && fs_extra_1.default.existsSync(file)) {
                writeFile = await this.ux.confirm(`File already exists, overwrite ${file}?`);
            }
            if (writeFile) {
                this.ux.log(`Saving query to ${file}`);
                fs_extra_1.default.writeFileSync(file, query);
            }
        }
        async describeSObjectsByType(sObjectType) {
            const { excludeparentfields, targetusername } = this.flags;
            const describeMap = {};
            const described = describeMap[sObjectType] = await sObject_1.describeSObject(sObjectType, targetusername, { ux: this.ux });
            if (!excludeparentfields) {
                const alreadyInProgress = new Set();
                const describePromises = [];
                for (const referenceField of this.filterCreateable(getReferenceFields(described))) {
                    if (referenceField.referenceTo) {
                        for (const referenceTo of referenceField.referenceTo) {
                            if (!alreadyInProgress.has(referenceTo)) {
                                describePromises.push(sObject_1.describeSObject(referenceTo, targetusername, { ux: this.ux }));
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
        filterCreateable(fields) {
            return this.flags.includenoncreateable ? fields : fields.filter(it => it.createable);
        }
    }
    DataExportSoqlQueryCreateCommand.description = `create file with soql query for exporting records`;
    DataExportSoqlQueryCreateCommand.flagsConfig = {
        sobjecttype: command_1.flags.string({
            char: 's',
            description: 'the API name of the object to create query, (default: all sobjects defined in config)',
            required: false
        }),
        noprompt: command_1.flags.boolean({
            char: 'p',
            description: 'no prompt to confirm overwrite',
            default: false,
            required: false
        }),
        excludeparentfields: command_1.flags.boolean({
            description: 'exclude parent name fields, e.g. "RecordType.Name"',
            default: false,
            required: false
        }),
        includenoncreateable: command_1.flags.boolean({
            description: 'include only createable fields are added',
            default: false,
            required: false
        })
    };
    DataExportSoqlQueryCreateCommand.requiresUsername = true;
    DataExportSoqlQueryCreateCommand.requiresProject = true;
    return DataExportSoqlQueryCreateCommand;
})();
exports.default = DataExportSoqlQueryCreateCommand;
const getNameFields = (result) => result.fields.filter(it => it.nameField);
const getReferenceFields = (result) => result.fields.filter(it => it.type === 'reference' && ts_types_1.isArray(it.referenceTo) && it.referenceTo.length && it.referenceTo[0]);
const getParentFieldNames = (describeMap, sObjectType, nonCreateable) => {
    return getReferenceFields(describeMap[sObjectType])
        .filter(it => it.relationshipName && (it.createable || nonCreateable))
        .reduce((arr, it) => {
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
//# sourceMappingURL=create.js.map