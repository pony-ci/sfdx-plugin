import {isArray} from '@salesforce/ts-types';
import crypto from 'crypto';
import {existsSync, readFileSync, readJSONSync, writeJSONSync} from 'fs-extra';
import path from 'path';
import slash from 'slash';
import {getUX} from './pubsub';

export async function updateSourcePathInfos(username: string, files: string | string[]): Promise<void> {
    const ux = await getUX();
    const infosFile = path.join(`.sfdx/orgs/${username}/sourcePathInfos.json`);
    if (!existsSync(infosFile)) {
        throw Error(`File not found: ${infosFile}`);
    }
    const infos = readJSONSync(infosFile);
    const updated = new Set();
    (isArray(files) ? files : [files])
        .map(slash)
        .forEach(file => {
            infos
                .filter(([infoPath]) => !updated.has(infoPath))
                .filter(([infoPath]) => slash(infoPath) === file || slash(infoPath).startsWith(file))
                .forEach(([infoPath, infoData]) => {
                    try {
                        const data = readFileSync(file).toString();
                        ux.log(`Updating source path info hash: ${file}`);
                        infoData.contentHash = hash(data);
                    } catch (e) {
                        ux.warn(e);
                    }
                    updated.add(infoPath);
                });
        });
    writeJSONSync(infosFile, infos);
}

function hash(data: string): string {
    const shasum = crypto.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
}
