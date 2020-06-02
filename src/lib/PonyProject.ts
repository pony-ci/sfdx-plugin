import {SfdxProject, SfdxProjectJson} from '@salesforce/core';
import {AnyJson, isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import {existsSync} from 'fs';
import fs, {readFileSync} from 'fs-extra';
import https from 'https';
import path from 'path';
import slash from 'slash';
import yaml from 'yaml';
import {
    Config,
    DataConfig,
    isConfig,
    isDataConfig,
    isPackageGroup,
    PackageGroup,
    validateConfig,
    validateDataConfig,
    validatePackageGroup
} from '..';
import {Environment, executeJobByName} from './jobs';
import {findComponents} from './metadata/components';
import {MetadataType} from './metadata/describeMetadata';

type Task = (arg: TaskArg) => TaskResult;
type TaskArg = object;
type TaskResult = unknown;

type TaskDefinitions = { [key: string]: Task };

export default class PonyProject {

    public readonly projectDir: string;
    private sfdxProject: Optional<SfdxProject>;
    private sfdxProjectJson: Optional<SfdxProjectJson>;
    private ponyConfig: Optional<Config>;
    private dataConfig: Optional<DataConfig>;
    private readonly packageGroups: { [name: string]: PackageGroup } = {};

    private constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    public static async load(projectDir: string = process.cwd()): Promise<PonyProject> {
        return new PonyProject(projectDir);
    }

    public getProjectName(): string {
        return path.basename(this.projectDir).toLowerCase().replace(/[^a-z0-9-_]/g, '');
    }

    public getNormalizedProjectName(): string {
        return this.getProjectName().slice(0, 10);
    }

    public async getPackageGroup(name: string = 'default'): Promise<PackageGroup> {
        const {packages = {}} = await this.getPonyConfig();
        return packages[name];
    }

    public async getPonyConfig(): Promise<Config> {
        if (!this.ponyConfig) {
            this.ponyConfig = await readConfig(this.projectDir);
        }
        return this.ponyConfig;
    }

    public async getDataConfig(): Promise<DataConfig> {
        const config = await this.getPonyConfig();
        return config.data || {};
    }

    public async getSfdxProjectJson(): Promise<SfdxProjectJson> {
        if (!this.sfdxProject || !this.sfdxProjectJson) {
            this.sfdxProject = await SfdxProject.resolve(this.projectDir);
            this.sfdxProjectJson = await this.sfdxProject.retrieveSfdxProjectJson();
        }
        return this.sfdxProjectJson;
    }

    public async findComponents(type: MetadataType): Promise<string[]> {
        const files: string[] = [];
        for (const file of await this.findAllComponents(type)) {
            if (await this.isSourceFile(file)) {
                files.push(file);
            }
        }
        return files;
    }

    public async findAllComponents(type: MetadataType): Promise<string[]> {
        return findComponents(type, this.projectDir);
    }

    public async isSourceFile(file: string): Promise<boolean> {
        const sfdxProjectJson = await this.getSfdxProjectJson();
        const {packageDirectories} = sfdxProjectJson.getContents();
        const slashed = ((p) => p.startsWith('./') ? p.substr(2) : p)(slash(file));
        return isArray(packageDirectories) && packageDirectories.some(it =>
            isJsonMap(it) &&
            isString(it.path) &&
            slashed.includes(`${slash(it.path)}/`)
        );
    }

    public async hasJob(name: string): Promise<boolean> {
        const {jobs = {}} = await this.getPonyConfig();
        return name in jobs;
    }

    public async executeJobByName(name: string, env: Environment): Promise<Environment> {
        const {jobs = {}} = await this.getPonyConfig();
        return executeJobByName(jobs, name, env);
    }
}

async function readConfig(projectDir: string): Promise<Config> {
    const yml = readFileSync(path.join(projectDir, '.pony/pony-config.yml')).toString();
    const config = yaml.parse(yml);
    if (!isConfig(config)) {
        throw Error(`${validateConfig(config)}`);
    }
    if (config.extends) {
        const extensionYml = readFileSync(config.extends).toString();
        const extension = yaml.parse(extensionYml);
        if (!isConfig(extension)) {
            throw Error(`${validateConfig(extension)}`);
        }
        return Object.assign(extension, config);
    }
    if (config.data) {
        const relationshipNameRegex = /^[a-zA-Z0-9_]+.[a-zA-Z0-9_]+$/;
        const relationships = config.data.sObjects?.import?.relationships || {};
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

async function readJSONExtension(extension: string): Promise<AnyJson> {
    return new Promise((resolve, reject) => {
        // tslint:disable-next-line:no-http-string
        if (['http://', 'https://'].some(it => extension.startsWith(it))) {
            https.get(extension, (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => resolve(JSON.parse(data)));
            }).on('error', (err) => {
                reject(err);
            });
        } else {
            reject(`Unsupported extension: ${extension}`);
        }
    });
}

function readJsonFileIfExists(file: string): Optional<AnyJson> {
    try {
        return fs.readJSONSync(file);
    } catch (e) {
        if (e.toString().includes('ENOENT')) {
            return undefined;
        }
        throw e;
    }
}
