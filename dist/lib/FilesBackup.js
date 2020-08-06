"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesBackup = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const klaw_sync_1 = __importDefault(require("klaw-sync"));
const path_1 = __importDefault(require("path"));
const app_1 = require("./app");
const pubsub_1 = require("./pubsub");
const sourcePathInfos_1 = require("./sourcePathInfos");
class FilesBackup {
    constructor(projectDir) {
        this.projectDir = projectDir;
        this.backupDir = this.getBackupDir();
    }
    static create(projectDir) {
        return new FilesBackup(projectDir);
    }
    clean() {
        fs_extra_1.default.emptyDirSync(this.getBackupDir());
    }
    backupFiles(files) {
        files.forEach(it => this.backupFile(it));
    }
    backupFile(file) {
        const dir = this.backupDir;
        const targetFile = path_1.default.join(dir, path_1.default.relative(this.projectDir, file));
        fs_extra_1.default.ensureFileSync(targetFile);
        fs_extra_1.default.copyFileSync(file, targetFile);
    }
    async restoreBackupFiles(username) {
        const ux = await pubsub_1.getUX();
        const dir = this.backupDir;
        if (fs_extra_1.default.existsSync(dir)) {
            const targetFiles = [];
            const files = klaw_sync_1.default(dir, { nodir: true });
            files.map(it => {
                const targetFile = path_1.default.join(this.projectDir, path_1.default.relative(dir, it.path));
                targetFiles.push(targetFile);
                fs_extra_1.default.ensureFileSync(targetFile);
                fs_extra_1.default.copyFileSync(it.path, targetFile);
            });
            if (username) {
                await sourcePathInfos_1.updateSourcePathInfos(this.projectDir, username, targetFiles);
            }
            fs_extra_1.default.removeSync(dir);
        }
        else {
            ux.warn(`Backup files dir not found: ${dir}`);
        }
    }
    getBackupDir() {
        const uniqueDirName = path_1.default.resolve(this.projectDir).replace(/[^a-zA-Z0-9-]/g, '');
        const dir = path_1.default.join(app_1.getAppHomeDir(), 'sourceBackup', uniqueDirName);
        fs_extra_1.default.ensureDirSync(dir);
        return dir;
    }
}
exports.FilesBackup = FilesBackup;
//# sourceMappingURL=FilesBackup.js.map