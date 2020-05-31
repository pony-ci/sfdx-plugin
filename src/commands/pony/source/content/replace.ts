import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {AnyJson, isAnyJson, isArray, isJsonArray, isJsonMap, isPlainObject, isString} from '@salesforce/ts-types';
import {JsonCollection} from '@salesforce/ts-types/lib/types/json';
import {
    InnerTextReplacement,
    isInnerTextReplacement,
    isOrgWideEmailAddressReplacement,
    OrgWideEmailAddressReplacement,
    readComponent,
    writeComponent
} from '../../../..';
import {FilesBackup} from '../../../../lib/FilesBackup';
import {Environment} from '../../../../lib/jobs';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';

export default class SourceContentReplaceCommand extends PonyCommand {

    public static description: string = `replace values in xml component files`;

    protected static flagsConfig: FlagsConfig = {
        replacement: flags.string({
            char: 'r',
            description: 'name of the replacement',
            required: true
        }),
        ponyenv: flags.string({
            description: 'environment',
            default: Environment.stringify(Environment.create()),
            hidden: true
        })
    };

    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const env = Environment.parse(this.flags.ponyenv);
        const {replacement} = this.flags;
        const project = await PonyProject.load();
        const {replacements = {}} = await project.getPonyConfig();
        const rpl = replacements[replacement];
        if (rpl) {
            if (isInnerTextReplacement(rpl) && rpl.innerText) {
                const backup = FilesBackup.create(project.projectDir);
                backup.backupFiles(rpl.innerText.files);
                await this.replaceInnerText(rpl.innerText, env);
            } else if (isOrgWideEmailAddressReplacement(rpl) && rpl.orgWideEmailAddress) {
                const backup = FilesBackup.create(project.projectDir);
                backup.backupFiles(rpl.orgWideEmailAddress.files);
                await this.replaceOrgWideEmailAddress(rpl.orgWideEmailAddress, env);
            }
        } else {
            throw Error(`Replacement not found: ${replacement}`);
        }
    }

    private async replaceOrgWideEmailAddress(rpl: OrgWideEmailAddressReplacement, env: Environment): Promise<string[]> {
        const {files, replacement} = rpl;
        for (const file of files) {
            this.ux.log(`Going to remove senderAddress and change senderType with value 'OrgWideEmailAddress' to '${replacement}' in ${file}`);
            const cmp = await readComponent(file);
            await replaceOrgWideEmailAddressHelper(cmp, env.fillString(replacement));
            await writeComponent(file, cmp);
        }
        return files;
    }

    private async replaceInnerText(rpl: InnerTextReplacement, env: Environment): Promise<string[]> {
        const {files, search, replacement} = rpl;
        for (const file of files) {
            this.ux.log(`Replacing content in ${file}`);
            const cmp = await readComponent(file);
            const replaced = await replaceInnerTextHelper(cmp, search, env.fillString(replacement));
            replaced.forEach((it, idx, array) => {
                this.ux.log(`  ${idx === array.length - 1 ? '└' : '├'} ${it.join(' -> ')}`);
            });
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

async function replaceInnerTextHelper(
    component: AnyJson, targets: string[], replacement: string
): Promise<[string, string][]> {
    if (!component) {
        return [];
    }
    const replaced: [string, string][] = [];
    if (isArray(component)) {
        if (component.length === 1 && isString(component[0]) && targets.includes(component[0])) {
            replaced.push([component[0], replacement]);
            component.splice(0, 1, replacement);
        } else {
            for (const child of component) {
                if (isAnyJson(child) && (isJsonMap(child) || isJsonArray(child))) {
                    replaced.push(...await replaceInnerTextHelper(child, targets, replacement));
                }
            }
        }
    } else if (isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (isString(value) && targets.includes(value)) {
                replaced.push([value, replacement]);
                component[key] = replacement;
            } else if (isAnyJson(value) && (isJsonMap(value) || isJsonArray(value))) {
                replaced.push(...await replaceInnerTextHelper(value, targets, replacement));
            }
        }
    }
    return replaced;
}