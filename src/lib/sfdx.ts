import {Flags, Opts, registerNamespace, sfdx as _sfdx} from '@pony-ci/sfdx-node';
import * as path from 'path';
import {PonyOrg} from './PonyOrg';
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
            } else if (p === 'force' && !(p in _sfdx)) {
                registerNamespace({
                    commandsDir: path.join(__dirname, '../../node_modules/salesforce-alm/dist/commands/'),
                    namespace: 'force'
                });
            }
            return _sfdx[p];
        }
    });
}

export {Flags, Opts} from '@pony-ci/sfdx-node';

// export interface PushSourceOptions {
//     forceoverwrite?: boolean;
//     ignorewarnings?: boolean;
//     wait?: number;
// }

export interface RunApexTestsOptions {
    targetusername?: string;
    synchronous?: boolean;
}

/**
 * Options for package installation.
 */
// export interface PackageInstallationOptions {
//     package: string;
//     apexcompile?: string;
//     publishwait?: string | number;
//     installationkey?: string;
//     securitytype?: string;
//     upgradetype?: string;
// }

// export interface CreateScratchOrgOptions {
//     setalias?: string;
//     noancestors?: boolean;
//     durationdays?: number;
//     definitionfile?: string;
//     nonamespace?: boolean;
//     setdefaultusername?: boolean;
//     targetdevhubusername?: string;
// }

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

export async function authJwtGrant(options: AuthJwtGrantOptions = {}): Promise<PonyOrg> {
    const ux = await getUX();
    ux.log(`Authorizing an org (${options.username}) using the JWT flow`);
    const {username} = sfdx.force.auth.jwtGrant({...options});
    return PonyOrg.createPonyOrg(username);
}

export async function logoutAll(): Promise<void> {
    const ux = await getUX();
    ux.log(`Logging out from all orgs`);
    return sfdx.force.auth.logout({
        all: true,
        noprompt: true,
    });
}

export async function listOrgs(options: ListOrgsOptions = {}): Promise<unknown> {
    const ux = await getUX();
    ux.log('Listing orgs');
    return sfdx.force.org.list({
        ...options,
    });
}
