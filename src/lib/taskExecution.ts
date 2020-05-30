import {exec as shell} from '@pony-ci/cli-exec';
import {Dictionary} from '@salesforce/ts-types/lib/types/collection';
import crypto from 'crypto';
import fs from 'fs-extra';
import klaw from 'klaw-sync';
import path from 'path';
import {getAppHomeDir} from './app';
import {replaceInComponent} from './filesManip';
import {useDevhub, useDevhubOrDefault, useOrg, useOrgOrDefault} from './PonyOrg';
import {getUX} from './pubsub';
import {authJwtGrant, listOrgs, logoutAll, sfdx} from './sfdx';

export type TaskArg = Dictionary;

export class FilesBackup {

    public readonly projectDir: string;
    public readonly backupDir: string;

    private constructor(projectDir: string) {
        this.projectDir = projectDir;
        this.backupDir = this.getBackupDir();
    }

    public static create(projectDir: string): FilesBackup {
        return new FilesBackup(projectDir);
    }

    public backupFiles(files: string[]): void {
        files.forEach(it => this.backupFile(it));
    }

    public backupFile(file: string): void {
        const dir = this.backupDir;
        const targetFile = path.join(dir, path.relative(this.projectDir, file));
        fs.ensureFileSync(targetFile);
        fs.copyFileSync(file, targetFile);
    }

    public async restoreBackupFiles(username?: string): Promise<void> {
        const ux = await getUX();
        const dir = this.backupDir;
        if (fs.existsSync(dir)) {
            const files = klaw(dir, {nodir: true});
            files.map(it => {
                const targetFile = path.join(this.projectDir, path.relative(dir, it.path));
                fs.ensureFileSync(targetFile);
                fs.copyFileSync(it.path, targetFile);
            });
            fs.removeSync(dir);
        } else {
            ux.warn(`Backup files dir not found: ${dir}`);
        }
    }

    private getBackupDir(): string {
        const uniqueDirName = path.resolve(this.projectDir).replace(/[^a-zA-Z0-9-]/g, '');
        const dir = path.join(getAppHomeDir(), 'sourceBackup', uniqueDirName);
        fs.ensureDirSync(dir);
        return dir;
    }
}

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

    }

    public backupFile(file: string): void {

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
