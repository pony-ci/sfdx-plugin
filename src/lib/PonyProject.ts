import {SfdxProject, SfdxProjectJson} from '@salesforce/core';
import {AnyJson, isArray, isFunction, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import fs from 'fs-extra';
import https from 'https';
import path from 'path';
import slash from 'slash';
import {Config, isConfig, isPackageGroup, PackageGroup, validateConfig, validatePackageGroup} from '..';
import {findComponents} from './metadata/components';
import {MetadataType} from './metadata/describeMetadata';
import {createTaskArg, TaskContext} from './taskExecution';
import {getUX} from './ux';

type Task = (arg: TaskArg) => TaskResult;
// tslint:disable-next-line:no-any
type TaskArg = any;
// tslint:disable-next-line:no-any
type TaskResult = any;

type TaskDefinitions = { [key: string]: Task };

export default class PonyProject {

    public readonly projectDir: string;
    private sfdxProject: Optional<SfdxProject>;
    private sfdxProjectJson: Optional<SfdxProjectJson>;
    private taskDefinitions: Optional<TaskDefinitions>;
    private ponyConfig: Optional<Config>;
    private readonly packageGroups: { [name: string]: PackageGroup } = {};

    private constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    public static async load(projectDir: string = process.cwd()): Promise<PonyProject> {
        return new PonyProject(projectDir);
    }

    public getProjectName(): string {
        return path.basename(this.projectDir).toLowerCase().replace(/[^a-z0-9]/, '');
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
    const config = readJsonFileIfExists(path.join(projectDir, '.pony/config.json')) || {};
    if (!isConfig(config)) {
        throw Error(`${validateConfig(config)}`);
    }
    if (config.extends) {
        const extension = await readJSONExtension(config.extends);
        if (!isConfig(extension)) {
            throw Error(`${validateConfig(extension)}`);
        }
        return Object.assign(extension, config);
    }
    return config;
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
