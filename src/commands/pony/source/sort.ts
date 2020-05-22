import {flags, FlagsConfig} from '@salesforce/command';
import {Dictionary, isArray, isObject, isString} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {EOL} from 'os';
import path from 'path';
import {Component, describeComponentFile, MetadataType, readComponent, registerUX, writeComponent} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
import {Field} from 'jsforce/describe-result';

const INNER_TEXT_SORT_KEY = '__inner_text__';

type SortDefinition = Dictionary<'__inner_text__' | string[]>[];

const SORT_DEFINITIONS_BY_METADATA_TYPE: Dictionary<SortDefinition> = {
    Profile: [
        {applicationVisibilities: ['application']},
        {classAccesses: ['apexClass']},
        {externalDataSourceAccesses: ['externalDataSource']},
        {fieldPermissions: ['field']},
        {flowAccesses: ['flow']},
        {layoutAssignments: ['recordType', 'layout']},
        {objectPermissions: ['object']},
        {pageAccesses: ['apexPage']},
        {recordTypeVisibilities: ['recordType']},
        {tabVisibilities: ['tab']},
        {userPermissions: ['name']},
        {userLicense: INNER_TEXT_SORT_KEY},
        {custom: INNER_TEXT_SORT_KEY},
        {customMetadataTypeAccesses: ['name']},
    ]
};

const SUPPORTED_METADATA: MetadataType[] = [
    'Profile'
];

export default class SourcePushCommand extends PonyCommand {
    public static readonly description: string = `sort xml source files

If no files are specified, sort files defined in .pony/config.json.
Possible values are 'source', 'all', 'none' or array of files and/or directories.

supported metadata:
${SUPPORTED_METADATA.map(it => `* ${it}`).join(EOL)}
`;

    public static examples: string[] = [
        `$ sfdx pony:source:sort"
        Sort files defined in .pony/config.json.
        `,
        `$ sfdx pony:source:sort --files src/main/default/profiles/Admin.profile-meta.xml
        `,
        `$ sfdx pony:source:sort --files "src/main/default/profiles/Admin.profile-meta.xml,src/main/default/profiles/Standard.profile-meta.xml"
        `,
        `$ sfdx pony:source:sort --files "src/main/default/profiles/*"
        `,
    ];

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        files: flags.string({
            char: 'f',
            description: 'comma separated list of files'
        })
    };

    public async run(): Promise<void> {
        registerUX(this.ux);
        const project = await PonyProject.load();
        const {sourceSort} = await project.getPonyConfig();
        if (this.flags.files) {
            const filesOrDirs = this.flags.files.split(',').map(it => it.trim());
            for (const file of filesOrDirs) {
                await this.sortComponentOrDir(file);
            }
        } else if (sourceSort === 'none') {
            this.ux.log('Sorting explicitly disabled in your config.');
        } else if (isArray(sourceSort)) {
            for (const file of sourceSort) {
                await this.sortComponentOrDir(file);
            }
        } else if (!sourceSort || isString(sourceSort)) {
            for (const type of SUPPORTED_METADATA) {
                const files = sourceSort === 'source'
                    ? await project.findComponents(type)
                    : await project.findAllComponents(type);
                for (const file of files) {
                    await this.sortComponent(file);
                }
            }
        }
    }

    private async sortComponentOrDir(fileOrDir: string): Promise<void> {
        if (fileOrDir.endsWith('*')) {
            const dir = fileOrDir.substr(0, fileOrDir.length - 2) || '.';
            for (const file of fs.readdirSync(dir)) {
                await this.sortComponent(path.join(dir, file));
            }
        } else {
            await this.sortComponent(fileOrDir);
        }
    }

    private async sortComponent(file: string): Promise<void> {
        const type = describeComponentFile(file);
        if (!SUPPORTED_METADATA.includes(type || '')) {
            throw Error(`Unsupported metadata: ${file}`);
        }
        this.ux.log(`Sorting: ${file}`);
        const content = await readComponent(file);
        if (!SORT_DEFINITIONS_BY_METADATA_TYPE.Profile) {
            throw Error(`Sort definition not defined for ${file}`);
        }
        sort(content, SORT_DEFINITIONS_BY_METADATA_TYPE.Profile);
        await writeComponent(file, content);
    }
}

function stringCompare(a: string, b: string): number {
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

function sort(component: Component, sortDefinition: SortDefinition): void {
    const root = component[Object.keys(component)[0]] || {};
    for (const entry of sortDefinition) {
        const key = Object.keys(entry)[0];
        const value = entry[key] || [];
        if (isArray(root[key]) && root[key].length) {
            if (value === INNER_TEXT_SORT_KEY) {
                root[key].sort((a, b) => stringCompare(a[0], b[0]));
                root[key] = filterUnique(key, root[key], (it) => isArray(it) && isString(it[0]) ? it[0] : '');
            } else {
                for (const val of value) {
                    root[key].sort((a, b) => {
                        if (a[val] && a[val].length && b[val] && b[val].length) {
                            return stringCompare(a[val][0], b[val][0]);
                        }
                        return a[val] && a[val].length ? 1 : -1;
                    });
                }
                root[key] = filterUnique(key, root[key], (it) =>
                    value.map(val => isObject(it) && isArray(it[val]) && it[val].length ? it[val][0] : '').join('!!'));
            }
        }
    }
}

function filterUnique<T>(key: string, array: T[], hashCode: (it: T) => string): T[] {
    const alreadySorted = new Set<string>();
    return array.filter((it) => {
        const hash = hashCode(it);
        if (alreadySorted.has(hash)) {
            console.warn(`removing duplicate ${key}:`, it);
            return false;
        }
        alreadySorted.add(hash);
        return true;
    });
}
