import {SfdxProject, SfdxProjectJson} from '@salesforce/core';
import {isArray, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import {existsSync} from 'fs';
import fs, {readFileSync, readJSONSync} from 'fs-extra';
import path from 'path';
import slash from 'slash';
import yaml from 'yaml';
import {
    Config,
    DataConfig,
    isConfig,
    isPackageGroups,
    Package,
    PackageGroups,
    validateConfig,
    validatePackageGroups
} from '..';
import {Environment, executeJobByName} from './jobs';
import {findComponents} from './metadata/components';
import {MetadataType} from './metadata/describeMetadata';

export default class PonyProject {

    public readonly projectDir: string;
    public ponyConfig: Config;
    public dataConfig: DataConfig;
    private sfdxProject: Optional<SfdxProject>;
    private sfdxProjectJson: Optional<SfdxProjectJson>;

    private constructor(projectDir: string, ponyConfig: Config, dataConfig: DataConfig) {
        this.projectDir = projectDir;
        this.ponyConfig = ponyConfig;
        this.dataConfig = dataConfig;
    }

    public static async load(projectDir: string = process.cwd()): Promise<PonyProject> {
        const ponyConfig = await readConfig(projectDir);
        const dataConfig = ponyConfig.data || {};
        return new PonyProject(projectDir, ponyConfig, dataConfig);
    }

    public getProjectName(): string {
        return path.basename(this.projectDir).toLowerCase().replace(/[^a-z0-9-_]/g, '');
    }

    public getNormalizedProjectName(): string {
        return this.getProjectName().slice(0, 10);
    }

    public async getPackageGroup(name: string = 'default'): Promise<Package[]> {
        const packageGroups = await readPackageGroups(this.projectDir);
        if (name in packageGroups) {
            return packageGroups[name];
        }
        throw new Error(`No group named ${name} found.`);
    }

    public async getSfdxProjectJson(): Promise<SfdxProjectJson> {
        if (!this.sfdxProject || !this.sfdxProjectJson) {
            this.sfdxProject = await SfdxProject.resolve(this.projectDir);
            this.sfdxProjectJson = await this.sfdxProject.retrieveSfdxProjectJson();
        }
        return this.sfdxProjectJson;
    }

    public async findComponents(metadataType: MetadataType): Promise<string[]> {
        const files: string[] = [];
        for (const file of await this.findAllComponents(metadataType)) {
            if (await this.isSourceFile(file)) {
                files.push(file);
            }
        }
        return files;
    }

    public async findAllComponents(metadataType: MetadataType): Promise<string[]> {
        return findComponents(metadataType, this.projectDir);
    }

    public async isSourceFile(file: string): Promise<boolean> {
        const sfdxProjectJson = await this.getSfdxProjectJson();
        const {packageDirectories} = sfdxProjectJson.getContents();
        const slashed = ((p) => p.startsWith('./') ? p.substr(2) : p)(slash(file));
        return isArray(packageDirectories) &&
            packageDirectories.some(it => it.path && slashed.includes(`${slash(it.path)}/`));
    }

    public hasJob(name: string): boolean {
        const {jobs = {}} = this.ponyConfig;
        return name in jobs;
    }

    public async executeJobByName(name: string, env: Environment): Promise<Environment> {
        const {jobs = {}} = this.ponyConfig;
        return executeJobByName(jobs, name, env);
    }
}

async function readPackageGroups(projectDir: string): Promise<PackageGroups> {
    const file = path.join(projectDir, '/data/groups/packages.json');
    if (!fs.existsSync(file)) {
        return {};
    }
    const groups = readJSONSync(file);
    if (!isPackageGroups(groups)) {
        throw Error(`${validatePackageGroups(groups)}`);
    }
    return groups;
}

async function readConfig(projectDir: string): Promise<Config> {
    const file = path.join(projectDir, '.pony/config.yml');
    const yml = existsSync(file) ? readFileSync(file).toString() : '{}';
    const config = yaml.parse(yml);
    if (!isConfig(config)) {
        throw Error(`${validateConfig(config)}`);
    }
    if (config.data) {
        const relationshipNameRegex = /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/;
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
