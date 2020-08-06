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
const __1 = require("../../..");
const sortDefinitions_1 = require("../../../lib/metadata/sortDefinitions");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
let SourceSortCommand = /** @class */ (() => {
    class SourceSortCommand extends PonyCommand_1.default {
        constructor() {
            super(...arguments);
            this.strict = false;
        }
        async run() {
            const project = await PonyProject_1.default.load();
            const { sourceSort } = project.ponyConfig;
            const { files } = this.flags;
            if (files) {
                for (const file of files) {
                    await this.sortComponent(file);
                }
            }
            else if (sourceSort === 'none') {
                this.ux.log('Sorting explicitly disabled.');
            }
            else if (ts_types_1.isArray(sourceSort)) {
                for (const file of sourceSort) {
                    await this.sortComponentOrDir(file);
                }
            }
            else if (!sourceSort || ts_types_1.isString(sourceSort)) {
                for (const type of sortDefinitions_1.supportedMetadataToSort) {
                    const filesToSort = sourceSort === 'all'
                        ? await project.findAllComponents(type)
                        : await project.findComponents(type);
                    for (const file of filesToSort) {
                        await this.sortComponent(file);
                    }
                }
            }
        }
        async sortComponentOrDir(fileOrDir) {
            if (fileOrDir.endsWith('*')) {
                const dir = fileOrDir.substr(0, fileOrDir.length - 2) || '.';
                for (const file of fs_extra_1.default.readdirSync(dir)) {
                    await this.sortComponent(path_1.default.join(dir, file));
                }
            }
            else {
                await this.sortComponent(fileOrDir);
            }
        }
        async sortComponent(file) {
            const type = __1.describeComponentFile(file);
            if (!sortDefinitions_1.supportedMetadataToSort.includes(type || '')) {
                throw Error(`Unsupported metadata: ${file}`);
            }
            this.ux.log(`sort: ${file}`);
            const content = await __1.readComponent(file);
            if (!sortDefinitions_1.sortDefinitions.Profile) {
                throw Error(`Sort definition not defined for ${file}`);
            }
            const duplicates = sort(content, sortDefinitions_1.sortDefinitions.Profile);
            duplicates.forEach(([key, it]) => this.ux.warn(`removing duplicate ${key}: ${JSON.stringify(it, null, 4)}`));
            await __1.writeComponent(file, content);
        }
    }
    SourceSortCommand.description = `sort xml source files

If no files are specified, command will sort files defined in .pony/config.json.
Possible values in the config are 'source', 'all', 'none' or array of files, default value is 'source'.

Supported metadata:
${sortDefinitions_1.supportedMetadataToSort.map(it => `   * ${it}`).join(os_1.EOL)}
`;
    SourceSortCommand.examples = [
        `$ sfdx pony:source:sort`,
        `$ sfdx pony:source:sort -f src/main/default/profiles/Admin.profile-meta.xml`,
        `$ sfdx pony:source:sort -f src/main/default/profiles/Admin.profile-meta.xml src/main/default/profiles/Standard.profile-meta.xml`,
        `$ sfdx pony:source:sort -f src/main/default/profiles/*`,
    ];
    SourceSortCommand.supportsUsername = false;
    SourceSortCommand.supportsDevhubUsername = false;
    SourceSortCommand.requiresProject = true;
    SourceSortCommand.flagsConfig = {
        files: command_1.flags.string({
            char: 'f',
            description: 'comma separated list of files',
            multiple: true
        })
    };
    return SourceSortCommand;
})();
exports.default = SourceSortCommand;
function stringCompare(a, b) {
    const minLen = Math.min(a.length, b.length);
    const aTrimmed = a.substr(0, minLen);
    const bTrimmed = b.substr(0, minLen);
    if (aTrimmed === bTrimmed) {
        if (a.length === b.length) {
            return 0;
        }
        return a.length > b.length ? 1 : -1;
    }
    for (let i = 0; i < minLen; i++) {
        if (aTrimmed[i] !== bTrimmed[i]) {
            return aTrimmed[i].charCodeAt(0) - bTrimmed[i].charCodeAt(0);
        }
    }
    return 0;
}
function sort(component, sortDefinition) {
    const allDuplicates = [];
    const root = Object.values(component)[0];
    if (!root) {
        throw Error('Invalid component.');
    }
    for (const entry of ts_types_1.definiteValuesOf(sortDefinition)) {
        const xmlName = Object.keys(entry)[0];
        const value = entry[xmlName];
        if (root && ts_types_1.isArray(root[xmlName]) && root[xmlName].length) {
            if (sortDefinitions_1.isInnerTextSortKey(value)) {
                root[xmlName].sort((a, b) => stringCompare(a[0], b[0]));
                const { result, duplicates } = filterUnique(xmlName, root[xmlName], (it) => ts_types_1.isArray(it) && ts_types_1.isString(it[0]) ? it[0] : '');
                root[xmlName] = result;
                duplicates.forEach(it => allDuplicates.push([xmlName, it]));
            }
            else {
                const { result, duplicates } = filterUnique(xmlName, root[xmlName], (it) => value.map(val => ts_types_1.isObject(it) && ts_types_1.isArray(it[val]) && it[val].length ? it[val][0] : '').join('!!'));
                root[xmlName] = result;
                duplicates.forEach(it => allDuplicates.push([xmlName, it]));
                const hasItem = (it) => Boolean(it && ts_types_1.isArray(it) && it.length && it[0]);
                root[xmlName] = root[xmlName].sort((a, b) => {
                    let eq = 0;
                    for (const val of value) {
                        if (hasItem(a[val]) && hasItem(b[val])) {
                            eq = stringCompare(a[val][0], b[val][0]);
                            if (eq !== 0) {
                                return eq;
                            }
                        }
                        else if (!hasItem(a[val]) && !hasItem(b[val])) {
                            eq = 0;
                        }
                        else {
                            eq = hasItem(a[val]) ? 1 : -1;
                        }
                    }
                    return eq;
                });
            }
        }
    }
    return allDuplicates;
}
function filterUnique(key, array, hashCode) {
    const alreadySorted = new Set();
    const duplicates = [];
    const result = array.filter((it) => {
        const hash = hashCode(it);
        if (alreadySorted.has(hash)) {
            duplicates.push(it);
            return false;
        }
        alreadySorted.add(hash);
        return true;
    });
    return { result, duplicates };
}
//# sourceMappingURL=sort.js.map