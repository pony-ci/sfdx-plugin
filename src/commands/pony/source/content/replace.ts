import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {AnyJson, isAnyJson, isArray, isJsonArray, isJsonMap, isPlainObject, isString} from '@salesforce/ts-types';
import {JsonCollection} from '@salesforce/ts-types/lib/types/json';
import {
    getUX,
    InnerTextReplacement,
    isInnerTextReplacement,
    isOrgWideEmailAddressReplacement,
    OrgWideEmailAddressReplacement,
    readComponent,
    writeComponent
} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';
import {FilesBackup} from '../../../../lib/taskExecution';

export default class SourceContentReplaceCommand extends PonyCommand {

    public static description: string = `replace values in xml component files`;

    protected static flagsConfig: FlagsConfig = {
        replacement: flags.string({
            char: 'r',
            description: 'name of the replacement',
            required: true
        })
    };

    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const {replacement} = this.flags;
        const project = await PonyProject.load();
        const {replacements = {}} = await project.getPonyConfig();
        const rpl = replacements[replacement];
        if (rpl) {
            if (isInnerTextReplacement(rpl) && rpl.innerText) {
                const backup = FilesBackup.create(project.projectDir);
                const files = await this.replaceInnerText(rpl.innerText);
                backup.backupFiles(files);
                // await backup.restoreBackupFiles();
                this.sendMessage({modifiedFiles: files});
            } else if (isOrgWideEmailAddressReplacement(rpl) && rpl.orgWideEmailAddress) {
                const backup = FilesBackup.create(project.projectDir);
                const files = await this.replaceOrgWideEmailAddress(rpl.orgWideEmailAddress);
                backup.backupFiles(files);
                // await backup.restoreBackupFiles();
                this.sendMessage({modifiedFiles: files});
            }
        } else {
            throw Error(`Replacement not found: ${replacement}`);
        }
    }

    private async replaceOrgWideEmailAddress(rpl: OrgWideEmailAddressReplacement): Promise<string[]> {
        const {files, replacement} = rpl;
        for (const file of files) {
            this.ux.log(`Going to remove senderAddress and change senderType with value 'OrgWideEmailAddress' to '${replacement}' in ${file}`);
            const cmp = await readComponent(file);
            await replaceOrgWideEmailAddressHelper(cmp, replacement);
            await writeComponent(file, cmp);
        }
        return files;
    }

    private async replaceInnerText(rpl: InnerTextReplacement): Promise<string[]> {
        const {files, search, replacement} = rpl;
        for (const file of files) {
            this.ux.log(`Replacing content in ${file}`);
            const cmp = await readComponent(file);
            await replaceInnerTextHelper(cmp, search, replacement);
            await writeComponent(file, cmp);
        }
        return files;
    }
}

async function replaceOrgWideEmailAddressHelper(component: JsonCollection, replacement: AnyJson): Promise<void> {
    if (!component) {
        return;
    }
    if (isArray(component)) {
        for (const child of component) {
            if (isAnyJson(child) && (isJsonMap(child) || isJsonArray(child))) {
                await replaceOrgWideEmailAddressHelper(child, replacement);
            }
        }
    } else if (isPlainObject(component)) {
        if (isArray(component.senderType) && component.senderType.length && component.senderType[0] === 'OrgWideEmailAddress') {
            delete component.senderAddress;
            component.senderType = [replacement];
        } else {
            for (const value of Object.values(component)) {
                if (isAnyJson(value) && (isJsonMap(value) || isJsonArray(value))) {
                    await replaceOrgWideEmailAddressHelper(value, replacement);
                }
            }
        }
    }
}

async function replaceInnerTextHelper(component: AnyJson, targets: string[], replacement: string): Promise<void> {
    if (!component) {
        return;
    }
    const ux = await getUX();
    const logReplacement = (it, to) => ux.log(JSON.stringify(it), '->', JSON.stringify(to));
    if (isArray(component)) {
        if (component.length === 1 && isString(component[0]) && targets.includes(component[0])) {
            logReplacement(component[0], replacement);
            component.splice(0, 1, replacement);
        } else {
            for (const child of component) {
                if (isAnyJson(child) && (isJsonMap(child) || isJsonArray(child))) {
                    await replaceInnerTextHelper(child, targets, replacement);
                }
            }
        }
    } else if (isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (isString(value) && targets.includes(value)) {
                logReplacement(value, replacement);
                component[key] = replacement;
            } else if (isAnyJson(value) && (isJsonMap(value) || isJsonArray(value))) {
                await replaceInnerTextHelper(value, targets, replacement);
            }
        }
    }
}