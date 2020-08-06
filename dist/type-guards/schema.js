"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOrgWideEmailAddressReplacement = exports.isInnerTextReplacement = exports.isDataConfig = exports.isPackageGroups = exports.isConfig = exports.validatePackageGroups = exports.validateJobs = exports.validateDataConfig = exports.validateConfig = void 0;
const ts_types_1 = require("@salesforce/ts-types");
const ajv_1 = __importDefault(require("ajv"));
const config_schema_json_1 = __importDefault(require("../schema/config.schema.json"));
const data_config_schema_json_1 = __importDefault(require("../schema/data-config.schema.json"));
const jobs_schema_json_1 = __importDefault(require("../schema/jobs.schema.json"));
const org_create_schema_json_1 = __importDefault(require("../schema/org-create.schema.json"));
const package_groups_schema_json_1 = __importDefault(require("../schema/package-groups.schema.json"));
const replacements_schema_json_1 = __importDefault(require("../schema/replacements.schema.json"));
const source_sort_schema_json_1 = __importDefault(require("../schema/source-sort.schema.json"));
const source_validate_schema_json_1 = __importDefault(require("../schema/source-validate.schema.json"));
const CONFIG_REF = 'config';
const DATA_REF = 'data';
const JOBS_REF = 'jobs';
const ORG_CREATE_REF = 'orgCreate';
const PACKAGE_GROUPS_REF = 'packageGroups';
const REPLACEMENTS_REF = 'replacements';
const SOURCE_SORT_REF = 'sourceSort';
const SOURCE_VALIDATE_REF = 'sourceValidate';
let ajv;
function validate(schemaKeyRef, value) {
    if (!ajv) {
        ajv = new ajv_1.default({ allErrors: true, extendRefs: 'fail' });
        ajv.addSchema(config_schema_json_1.default, CONFIG_REF);
        ajv.addSchema(data_config_schema_json_1.default, DATA_REF);
        ajv.addSchema(jobs_schema_json_1.default, JOBS_REF);
        ajv.addSchema(org_create_schema_json_1.default, ORG_CREATE_REF);
        ajv.addSchema(package_groups_schema_json_1.default, PACKAGE_GROUPS_REF);
        ajv.addSchema(replacements_schema_json_1.default, REPLACEMENTS_REF);
        ajv.addSchema(source_sort_schema_json_1.default, SOURCE_SORT_REF);
        ajv.addSchema(source_validate_schema_json_1.default, SOURCE_VALIDATE_REF);
    }
    ajv.validate(schemaKeyRef, value);
    if (ajv.errors) {
        return `Invalid '${schemaKeyRef}': ${ajv.errorsText(ajv.errors)}`;
    }
}
exports.validateConfig = (value) => validate(CONFIG_REF, value);
exports.validateDataConfig = (value) => validate(DATA_REF, value);
exports.validateJobs = (value) => validate(JOBS_REF, value);
exports.validatePackageGroups = (value) => validate(PACKAGE_GROUPS_REF, value);
exports.isConfig = (value) => ts_types_1.isAnyJson(value) && exports.validateConfig(value) === undefined;
exports.isPackageGroups = (value) => ts_types_1.isAnyJson(value) && exports.validatePackageGroups(value) === undefined;
exports.isDataConfig = (value) => ts_types_1.isAnyJson(value) && exports.validateDataConfig(value) === undefined;
exports.isInnerTextReplacement = (value) => ts_types_1.isAnyJson(value) && ts_types_1.isJsonMap(value) && 'innerText' in value;
exports.isOrgWideEmailAddressReplacement = (value) => ts_types_1.isAnyJson(value) && ts_types_1.isJsonMap(value) && 'orgWideEmailAddress' in value;
//# sourceMappingURL=schema.js.map