import {Dictionary} from '@salesforce/ts-types/lib/types/collection';
import fs from 'fs-extra';
import klaw from 'klaw-sync';
import path from 'path';
import {getAppHomeDir} from './app';
import {getUX} from './pubsub';
import {updateSourcePathInfos} from './sourcePathInfos';

// todo rename file

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

    public clean(): void {
        fs.emptyDirSync(this.projectDir);
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
            const targetFiles: string[] = [];
            const files = klaw(dir, {nodir: true});
            files.map(it => {
                const targetFile = path.join(this.projectDir, path.relative(dir, it.path));
                targetFiles.push(targetFile);
                fs.ensureFileSync(targetFile);
                fs.copyFileSync(it.path, targetFile);
            });
            if (username) {
                await updateSourcePathInfos(username, targetFiles);
            }
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
