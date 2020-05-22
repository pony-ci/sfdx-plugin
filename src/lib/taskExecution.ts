import {exec as shell} from '@pony-ci/cli-exec';
import {Dictionary} from '@salesforce/ts-types/lib/types/collection';
import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import {getAppHomeDir} from './app';
import {replaceInComponent} from './filesManip';
import {useDevhub, useDevhubOrDefault, useOrg, useOrgOrDefault} from './PonyOrg';
import {authJwtGrant, listOrgs, logoutAll, sfdx} from './sfdx';
import {updateSourcePathInfos} from './sourcePathInfos';

export type TaskArg = Dictionary<any>;

export class TaskContext {

    public readonly id: string;
    public readonly backupFiles: Set<string> = new Set<string>();
    public updateHashes: boolean = true;

    private constructor(id?: string) {
        this.id = id || `${new Date().toISOString()}@${crypto.randomBytes(12).toString('hex')}`;
    }

    public static create(id?: string): TaskContext {
        return new TaskContext(id);
    }

    public async restoreBackupFiles(username: string): Promise<void> {
        const dir = path.join(this.getFilesBackupDir(), this.id);
        if (fs.existsSync(dir)) {
            const info = fs.readJSONSync(path.join(dir, 'info.json'));
            info.files.forEach(file => {
                fs.ensureFileSync(file);
                fs.copyFileSync(path.join(dir, path.basename(file)), file);
            });
            fs.removeSync(dir);
            if (this.updateHashes) {
                await updateSourcePathInfos(username, [...this.backupFiles]);
                this.backupFiles.clear();
            }
        } else {
            console.warn(`Backup files dir not found: ${dir}`);
        }
    }

    public backupFile(file: string): void {
        const dir = path.join(this.getFilesBackupDir(), this.id);
        const targetFile = path.join(dir, path.basename(file));
        const infoFile = path.join(dir, 'info.json');
        fs.ensureDirSync(this.id);
        fs.ensureFileSync(targetFile);
        if (!fs.existsSync(infoFile)) {
            fs.writeJSONSync(infoFile, {
                files: []
            });
        }
        const info = fs.readJSONSync(infoFile);
        info.files.push(file);
        fs.writeJSONSync(infoFile, info);
        fs.copyFileSync(file, targetFile);
        this.backupFiles.add(file);
    }

    private getFilesBackupDir(): string {
        const dir = path.join(getAppHomeDir(), 'files-backups');
        fs.ensureDirSync(dir);
        return dir;
    }
}

export function createTaskArg(name: string, context: TaskContext): TaskArg {
    return {
        sfdx,
        authJwtGrant,
        logoutAll,
        listOrgs,
        useOrg,
        useDevhub,
        useOrgOrDefault,
        useDevhubOrDefault,
        shell,
        context,
        replaceInComponent: async (file: string, targets: string[], replacement: string) => {
            context.backupFile(file);
            await replaceInComponent(file, targets, replacement);
        }
    };
}
