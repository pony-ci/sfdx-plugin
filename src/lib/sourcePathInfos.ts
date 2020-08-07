import crypto from 'crypto';
import {existsSync, readFileSync, readJSONSync, writeJSONSync} from 'fs-extra';
import path from 'path';
import slash from 'slash';
import {getUX} from './pubsub';

export async function updateSourcePathInfos(
    projectDir: string,
    username: string,
    files: string[]
): Promise<void> {
    const ux = getUX();
    const infosFile = path.join(projectDir, `.sfdx/orgs/${username}/sourcePathInfos.json`);
    if (!existsSync(infosFile)) {
        throw Error(`File not found: ${infosFile}`);
    }
    const infos = readJSONSync(infosFile);
    const updated = new Set();
    const updates: string[] = [];
    files
        .map(slash)
        .forEach((file) => {
            infos
                .filter(([infoPath]) => !updated.has(infoPath))
                .filter(([infoPath]) => slash(infoPath) === file || slash(infoPath).startsWith(file))
                .forEach(([infoPath, infoData]) => {
                    try {
                        const data = readFileSync(file).toString();
                        infoData.contentHash = hash(data);
                        updates.push(file);
                    } catch (e) {
                        ux.warn(e);
                    }
                    updated.add(infoPath);
                });
        });
    if (updates.length) {
        ux.log(`Updating source path info hashes to sync the source with scratch org`);
    }
    updates.forEach((it, idx, array) => {
        ux.log(`  ${idx === array.length - 1 ? '└' : '├'} ${path.relative(projectDir, it)}`);
    });
    writeJSONSync(infosFile, infos);
}

function hash(data: string): string {
    const shasum = crypto.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
}
