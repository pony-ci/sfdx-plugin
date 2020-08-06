import { Dictionary } from '@salesforce/ts-types/lib/types/collection';
export declare type TaskArg = Dictionary;
export declare class FilesBackup {
    readonly projectDir: string;
    readonly backupDir: string;
    private constructor();
    static create(projectDir: string): FilesBackup;
    clean(): void;
    backupFiles(files: string[]): void;
    backupFile(file: string): void;
    restoreBackupFiles(username?: string): Promise<void>;
    private getBackupDir;
}
