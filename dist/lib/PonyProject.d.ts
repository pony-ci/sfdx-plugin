import { SfdxProjectJson } from '@salesforce/core';
import { Config, DataConfig, Package } from '..';
import { Environment } from './jobs';
import { MetadataType } from './metadata/describeMetadata';
export default class PonyProject {
    readonly projectDir: string;
    ponyConfig: Config;
    dataConfig: DataConfig;
    private sfdxProject;
    private sfdxProjectJson;
    private constructor();
    static load(projectDir?: string): Promise<PonyProject>;
    getProjectName(): string;
    getNormalizedProjectName(): string;
    getPackageGroup(name?: string): Promise<Package[]>;
    getSfdxProjectJson(): Promise<SfdxProjectJson>;
    findComponents(type: MetadataType): Promise<string[]>;
    findAllComponents(type: MetadataType): Promise<string[]>;
    isSourceFile(file: string): Promise<boolean>;
    hasJob(name: string): boolean;
    executeJobByName(name: string, env: Environment): Promise<Environment>;
}
