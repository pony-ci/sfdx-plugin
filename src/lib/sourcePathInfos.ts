import crypto from 'crypto';
import {readFileSync, readJSONSync, writeJSONSync} from 'fs-extra';
import * as path from 'path';
import slash from 'slash';
import {PonyOrg} from './PonyOrg';
import {getUX} from './ux';

export async function updateSourcePathInfos(org: string | PonyOrg, files: string | string[]): Promise<void> {
    const ux = await getUX();
    const username = org instanceof PonyOrg ? org.getUsername() : org;
    const infosFile = path.join(`.sfdx/orgs/${username}/sourcePathInfos.json`);
    const infos = readJSONSync(infosFile);
    const updated = new Set();

    (files instanceof Array ? files : [files])
        .map(it => slash(path.join(process.cwd(), it)))
        .forEach(file => {
            infos
                .filter(([infoPath]) => !updated.has(infoPath))
                .filter(([infoPath]) => infoPath === file || infoPath.startsWith(file))
                .forEach(([infoPath, infoData]) => {
                    try {
                        const data = readFileSync(file).toString();
                        console.log(`Updating source path info hash: ${file}`);
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
