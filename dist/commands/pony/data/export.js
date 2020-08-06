"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reversedOrder = exports.defaultSoqlDeleteDir = exports.defaultSoqlExportDir = exports.defaultRecordsDir = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const __1 = require("../../..");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
exports.defaultRecordsDir = 'data/sObjects/';
exports.defaultSoqlExportDir = 'scripts/soql/export/';
exports.defaultSoqlDeleteDir = 'scripts/soql/delete/';
exports.reversedOrder = 'reversedOrder';
const toQueryFile = (soqlExportDir, sObjectName) => path_1.default.join(soqlExportDir, `${sObjectName}.soql`);
let DataExportCommand = /** @class */ (() => {
    class DataExportCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b, _c;
            const project = await PonyProject_1.default.load();
            const { sObjects = {} } = project.dataConfig;
            const recordsDir = sObjects.recordsDir || exports.defaultRecordsDir;
            const soqlExportDir = ((_a = sObjects.export) === null || _a === void 0 ? void 0 : _a.soqlExportDir) || exports.defaultSoqlExportDir;
            const exportOrder = ((_b = sObjects.export) === null || _b === void 0 ? void 0 : _b.order) || exports.reversedOrder;
            const importOrder = ((_c = sObjects === null || sObjects === void 0 ? void 0 : sObjects.import) === null || _c === void 0 ? void 0 : _c.order) || [];
            const sObjectNames = exportOrder === exports.reversedOrder
                ? reverseArray(importOrder) : exportOrder;
            for (const sObjectName of sObjectNames) {
                const queryFile = toQueryFile(soqlExportDir, sObjectName);
                if (!fs_extra_1.default.existsSync(queryFile)) {
                    throw Error(`File with query not found: ${queryFile}`);
                }
            }
            for (const sObjectName of sObjectNames) {
                this.ux.log(`Exporting ${sObjectName}`);
                const { records } = await __1.sfdx.force.data.tree.export({
                    targetusername: this.flags.targetusername,
                    outputdir: recordsDir,
                    query: toQueryFile(soqlExportDir, sObjectName)
                });
                if (!records.length) {
                    fs_extra_1.default.writeJSONSync(path_1.default.join(recordsDir, `${sObjectName}.json`), { records });
                }
            }
        }
    }
    DataExportCommand.description = `export records
    
Use 'sfdx force:data:soql:query:create' command to create a query for export.
`;
    DataExportCommand.flagsConfig = {};
    DataExportCommand.requiresUsername = true;
    DataExportCommand.requiresProject = true;
    return DataExportCommand;
})();
exports.default = DataExportCommand;
function reverseArray(arr) {
    const result = [];
    for (let i = arr.length - 1; i >= 0; --i) {
        result.push(arr[i]);
    }
    return result;
}
//# sourceMappingURL=export.js.map