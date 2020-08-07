import {Flags, Opts, registerNamespace, sfdx as _sfdx} from '@pony-ci/sfdx-node';
import path from 'path';
import {getUX} from './pubsub';

// tslint:disable-next-line:no-any
export const sfdx: any = {};

for (const p of ['force', 'pony']) {
    Object.defineProperty(sfdx, p, {
        get: () => {
            if (p === 'pony' && !(p in _sfdx)) {
                registerNamespace({
                    commandsDir: path.join(__dirname, '../../dist/commands'),
                    namespace: 'pony'
                });
            }
            return _sfdx[p];
        }
    });
}

export {Flags, Opts} from '@pony-ci/sfdx-node';

export interface RunApexTestsOptions {
    targetusername?: string;
    synchronous?: boolean;
}

export interface AuthJwtGrantOptions {
    jwtkeyfile?: string;
    clientid?: string;
    username?: string;
    instanceurl?: string;
}

/**
 * Options for package installation.
 */
export interface ListOrgsOptions {
    all?: boolean;
    clean?: boolean;
    verbose?: boolean;
}

export async function logoutAll(): Promise<void> {
    const ux = getUX();
    ux.log(`Logging out from all orgs`);
    return sfdx.force.auth.logout({
        all: true,
        noprompt: true,
    });
}

export async function listOrgs(options: ListOrgsOptions = {}): Promise<unknown> {
    const ux = getUX();
    ux.log('Listing orgs');
    return sfdx.force.org.list({
        ...options,
    });
}
