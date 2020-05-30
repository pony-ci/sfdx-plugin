import {Optional} from '@salesforce/ts-types';
import cmdExists from 'command-exists-promise';
import fs from 'fs-extra';
import {homedir} from 'os';
import path from 'path';

const commandExists = async (cmd: string): Promise<boolean> => cmdExists(cmd);

export function getAppHomeDir(): string {
    const dir = path.join(homedir(), '.pony');
    fs.ensureDirSync(dir);
    return dir;
}

let gitInstalled: Optional<boolean>;

export async function isGitInstalled(): Promise<boolean> {
    if (gitInstalled === undefined) {
        gitInstalled = await commandExists('git');
    }
    return gitInstalled;
}
