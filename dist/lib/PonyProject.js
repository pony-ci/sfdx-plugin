"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@salesforce/core");
const ts_types_1 = require("@salesforce/ts-types");
const fs_1 = require("fs");
const fs_extra_1 = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const yaml_1 = __importDefault(require("yaml"));
const __1 = require("..");
const jobs_1 = require("./jobs");
const components_1 = require("./metadata/components");
class PonyProject {
    constructor(projectDir, ponyConfig, dataConfig) {
        this.projectDir = projectDir;
        this.ponyConfig = ponyConfig;
        this.dataConfig = dataConfig;
    }
    static async load(projectDir = process.cwd()) {
        const ponyConfig = await readConfig(projectDir);
        const dataConfig = ponyConfig.data || {};
        return new PonyProject(projectDir, ponyConfig, dataConfig);
    }
    getProjectName() {
        return path_1.default.basename(this.projectDir).toLowerCase().replace(/[^a-z0-9-_]/g, '');
    }
    getNormalizedProjectName() {
        return this.getProjectName().slice(0, 10);
    }
    async getPackageGroup(name = 'default') {
        const packageGroups = await readPackageGroups(this.projectDir);
        if (name in packageGroups) {
            return packageGroups[name];
        }
        throw new Error(`No group named ${name} found.`);
    }
    async getSfdxProjectJson() {
        if (!this.sfdxProject || !this.sfdxProjectJson) {
            this.sfdxProject = await core_1.SfdxProject.resolve(this.projectDir);
            this.sfdxProjectJson = await this.sfdxProject.retrieveSfdxProjectJson();
        }
        return this.sfdxProjectJson;
    }
    async findComponents(type) {
        const files = [];
        for (const file of await this.findAllComponents(type)) {
            if (await this.isSourceFile(file)) {
                files.push(file);
            }
        }
        return files;
    }
    async findAllComponents(type) {
        return components_1.findComponents(type, this.projectDir);
    }
    async isSourceFile(file) {
        const sfdxProjectJson = await this.getSfdxProjectJson();
        const { packageDirectories } = sfdxProjectJson.getContents();
        const slashed = ((p) => p.startsWith('./') ? p.substr(2) : p)(slash_1.default(file));
        return ts_types_1.isArray(packageDirectories) && packageDirectories.some(it => ts_types_1.isJsonMap(it) &&
            ts_types_1.isString(it.path) &&
            slashed.includes(`${slash_1.default(it.path)}/`));
    }
    hasJob(name) {
        const { jobs = {} } = this.ponyConfig;
        return name in jobs;
    }
    async executeJobByName(name, env) {
        const { jobs = {} } = this.ponyConfig;
        return jobs_1.executeJobByName(jobs, name, env);
    }
}
exports.default = PonyProject;
async function readPackageGroups(projectDir) {
    const file = path_1.default.join(projectDir, '/data/groups/packages.json');
    if (!fs_extra_1.default.existsSync(file)) {
        return {};
    }
    const groups = fs_extra_1.readJSONSync(file);
    if (!__1.isPackageGroups(groups)) {
        throw Error(`${__1.validatePackageGroups(groups)}`);
    }
    return groups;
}
async function readConfig(projectDir) {
    var _a, _b;
    const file = path_1.default.join(projectDir, '.pony/config.yml');
    const yml = fs_1.existsSync(file) ? fs_extra_1.readFileSync(file).toString() : '{}';
    const config = yaml_1.default.parse(yml);
    if (!__1.isConfig(config)) {
        throw Error(`${__1.validateConfig(config)}`);
    }
    if (config.data) {
        const relationshipNameRegex = /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/;
        const relationships = ((_b = (_a = config.data.sObjects) === null || _a === void 0 ? void 0 : _a.import) === null || _b === void 0 ? void 0 : _b.relationships) || {};
        for (const [sObject, fields] of Object.entries(relationships)) {
            for (const field of fields) {
                if (!relationshipNameRegex.test(field)) {
                    throw Error(`Invalid relationship: ${field}`);
                }
                if (field.toLowerCase().startsWith('recordtype.') &&
                    field.toLowerCase() !== 'recordtype.developername') {
                    throw Error(`Relationship RecordType can be mapped only by DeveloperName: ${sObject}`);
                }
            }
        }
    }
    return config;
}
//# sourceMappingURL=PonyProject.js.map