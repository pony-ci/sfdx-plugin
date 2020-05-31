import {SfdxProject, SfdxProjectJson} from '@salesforce/core';
import {AnyJson, isArray, isFunction, isJsonMap, isString, Optional} from '@salesforce/ts-types';
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
import {getUX} from './pubsub';
import {createTaskArg, TaskContext} from './taskExecution';

type Task = (arg: TaskArg) => TaskResult;
type TaskArg = object;
type TaskResult = unknown;

type TaskDefinitions = { [key: string]: Task };

export default class PonyProject {

    public readonly projectDir: string;
    private sfdxProject: Optional<SfdxProject>;
    private sfdxProjectJson: Optional<SfdxProjectJson>;
    private taskDefinitions: Optional<TaskDefinitions>;
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

    public async getTaskDefinitions(): Promise<TaskDefinitions> {
        if (!this.taskDefinitions) {
            this.taskDefinitions = await readTaskDefinitions(this.projectDir);
        }
        return this.taskDefinitions;
    }

    public async getPackageGroup(name: string = 'default'): Promise<PackageGroup> {
        if (!this.packageGroups.name) {
            this.packageGroups.name = await readPackageGroup(name, this.projectDir);
        }
        return this.packageGroups.name;
    }

    public async getPonyConfig(): Promise<Config> {
        if (!this.ponyConfig) {
            this.ponyConfig = await readConfig(this.projectDir);
        }
        return this.ponyConfig;
    }

    public async getDataConfig(): Promise<DataConfig> {
        if (!this.dataConfig) {
            this.dataConfig = await readDataConfig(this.projectDir);
        }
        return this.dataConfig;
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

    public async runTaskIfDefined(
        name: string,
        arg: TaskArg,
        ctx: TaskContext = TaskContext.create()
    ): Promise<TaskResult> {
        const ux = await getUX();
        if (!await this.hasTask(name)) {
            return Promise.resolve();
        }
        if (!this.taskDefinitions) {
            this.taskDefinitions = await readTaskDefinitions(this.projectDir);
        }
        const task = this.taskDefinitions[name];
        ux.log(`Running task: ${name}`);
        return task({...arg, ...createTaskArg(name, ctx)});
    }

    public async hasTask(name: string): Promise<boolean> {
        const tasks = await this.getTaskDefinitions();
        return tasks && isFunction(tasks[name]);
    }
}

async function readPackageGroup(name: string, projectDir: string): Promise<PackageGroup> {
    const packageGroup = readJsonFileIfExists(path.join(projectDir, `data/packages/${name}.json`));
    if (!packageGroup) {
        throw Error(`No package group named '${name}' found.`);
    }
    if (!isPackageGroup(packageGroup)) {
        throw Error(`${validatePackageGroup(packageGroup)}`);
    }
    if (isString(packageGroup.extends)) {
        const extension = await readJSONExtension(packageGroup.extends);
        if (!isPackageGroup(extension)) {
            throw Error(`${validatePackageGroup(extension)}`);
        }
        return Object.assign(extension, packageGroup);
    }
    return packageGroup as PackageGroup;
}

async function readConfig(projectDir: string): Promise<Config> {
    // const yml = readFileSync(path.join(projectDir, '.pony/pony-config.yml')).toString(); todo
    const yml = readFileSync('/home/ondrej/projects/pony-ci/sfdx-plugin/template.yml').toString();
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
    return config;
}

async function readDataConfig(projectDir: string): Promise<DataConfig> {
    const file = '/home/ondrej/projects/pony-ci/sfdx-plugin/data.yml';
    // const file = path.join(projectDir, '/data.yml');
    if (!existsSync(file)) {
        return {};
    }
    const yml = readFileSync(file).toString();
    const data = yaml.parse(yml);
    if (!isDataConfig(data)) {
        throw Error(`${validateDataConfig(data)}`);
    }
    const relationshipNameRegex = /^[a-zA-Z0-9_]+.[a-zA-Z0-9_]+$/;
    const relationships = data?.sObjects?.import?.relationships || {};
    for (const [sObject, fields] of Object.entries(relationships)) {
        for (const field of fields) {
            if (!relationshipNameRegex.test(field)) {
                throw Error(`Invalid relationship: ${field}`);
            }
            if (field.toLowerCase().startsWith('recordtype.') && field.toLowerCase() !== 'recordtype.developername') {
                throw Error(`Relationship RecordType can be mapped only by DeveloperName: ${sObject}`);
            }
        }
    }
    return data;
}

async function readTaskDefinitions(projectDir: string): Promise<TaskDefinitions> {
    try {
        const file = path.join(projectDir, '.pony/tasks.js');
        // tslint:disable-next-line:non-literal-require
        return require(file);
    } catch (e) {
        if (e.toString().includes('Cannot find module')) {
            return {};
        }
        const ux = await getUX();
        ux.error(e);
        throw e;
    }
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
