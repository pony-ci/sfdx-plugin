import fs from 'fs-extra';
import {homedir} from 'os';
import path from 'path';

export function getAppHomeDir(): string {
    const dir = path.join(homedir(), '.pony');
    fs.ensureDirSync(dir);
    return dir;
}
