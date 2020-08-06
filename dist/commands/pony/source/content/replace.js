"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const ts_types_1 = require("@salesforce/ts-types");
const __1 = require("../../../..");
const FilesBackup_1 = require("../../../../lib/FilesBackup");
const jobs_1 = require("../../../../lib/jobs");
const PonyCommand_1 = __importDefault(require("../../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../../lib/PonyProject"));
let SourceContentReplaceCommand = /** @class */ (() => {
    class SourceContentReplaceCommand extends PonyCommand_1.default {
        async run() {
            const env = jobs_1.Environment.parse(this.flags.ponyenv);
            const { replacement } = this.flags;
            const project = await PonyProject_1.default.load();
            const { replacements = {} } = project.ponyConfig;
            const rpl = replacements[replacement];
            if (rpl) {
                if (__1.isInnerTextReplacement(rpl) && rpl.innerText) {
                    const backup = FilesBackup_1.FilesBackup.create(project.projectDir);
                    backup.backupFiles(rpl.innerText.files);
                    await this.replaceInnerText(rpl.innerText, env);
                }
                else if (__1.isOrgWideEmailAddressReplacement(rpl) && rpl.orgWideEmailAddress) {
                    const backup = FilesBackup_1.FilesBackup.create(project.projectDir);
                    backup.backupFiles(rpl.orgWideEmailAddress.files);
                    await this.replaceOrgWideEmailAddress(rpl.orgWideEmailAddress, env);
                }
            }
            else {
                throw Error(`Replacement not found: ${replacement}`);
            }
        }
        async replaceOrgWideEmailAddress(rpl, env) {
            const { files, replacement } = rpl;
            for (const file of files) {
                this.ux.log(`Going to remove senderAddress and change senderType with value 'OrgWideEmailAddress' to '${replacement}' in ${file}`);
                const cmp = await __1.readComponent(file);
                await replaceOrgWideEmailAddressHelper(cmp, env.fillString(replacement));
                await __1.writeComponent(file, cmp);
            }
            return files;
        }
        async replaceInnerText(rpl, env) {
            const { files, search, replacement } = rpl;
            for (const file of files) {
                this.ux.log(`Replacing content in ${file}`);
                const cmp = await __1.readComponent(file);
                const replaced = await replaceInnerTextHelper(cmp, search, env.fillString(replacement));
                replaced.forEach((it, idx, array) => {
                    this.ux.log(`  ${idx === array.length - 1 ? '└' : '├'} ${it.join(' → ')}`);
                });
                await __1.writeComponent(file, cmp);
            }
            return files;
        }
    }
    SourceContentReplaceCommand.description = `replace values in xml component files`;
    SourceContentReplaceCommand.flagsConfig = {
        replacement: command_1.flags.string({
            char: 'r',
            description: 'name of the replacement',
            required: true
        }),
        ponyenv: command_1.flags.string({
            description: 'environment',
            default: jobs_1.Environment.stringify(jobs_1.Environment.default()),
            hidden: true
        })
    };
    SourceContentReplaceCommand.requiresProject = true;
    return SourceContentReplaceCommand;
})();
exports.default = SourceContentReplaceCommand;
async function replaceOrgWideEmailAddressHelper(component, replacement) {
    if (!component) {
        return;
    }
    if (ts_types_1.isArray(component)) {
        for (const child of component) {
            if (ts_types_1.isAnyJson(child) && (ts_types_1.isJsonMap(child) || ts_types_1.isJsonArray(child))) {
                await replaceOrgWideEmailAddressHelper(child, replacement);
            }
        }
    }
    else if (ts_types_1.isPlainObject(component)) {
        if (ts_types_1.isArray(component.senderType) && component.senderType.length && component.senderType[0] === 'OrgWideEmailAddress') {
            delete component.senderAddress;
            component.senderType = [replacement];
        }
        else {
            for (const value of Object.values(component)) {
                if (ts_types_1.isAnyJson(value) && (ts_types_1.isJsonMap(value) || ts_types_1.isJsonArray(value))) {
                    await replaceOrgWideEmailAddressHelper(value, replacement);
                }
            }
        }
    }
}
async function replaceInnerTextHelper(component, targets, replacement) {
    if (!component) {
        return [];
    }
    const replaced = [];
    if (ts_types_1.isArray(component)) {
        if (component.length === 1 && ts_types_1.isString(component[0]) && targets.includes(component[0])) {
            replaced.push([component[0], replacement]);
            component.splice(0, 1, replacement);
        }
        else {
            for (const child of component) {
                if (ts_types_1.isAnyJson(child) && (ts_types_1.isJsonMap(child) || ts_types_1.isJsonArray(child))) {
                    replaced.push(...await replaceInnerTextHelper(child, targets, replacement));
                }
            }
        }
    }
    else if (ts_types_1.isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (ts_types_1.isString(value) && targets.includes(value)) {
                replaced.push([value, replacement]);
                component[key] = replacement;
            }
            else if (ts_types_1.isAnyJson(value) && (ts_types_1.isJsonMap(value) || ts_types_1.isJsonArray(value))) {
                replaced.push(...await replaceInnerTextHelper(value, targets, replacement));
            }
        }
    }
    return replaced;
}
//# sourceMappingURL=replace.js.map