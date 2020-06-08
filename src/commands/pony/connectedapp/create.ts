import {flags, FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {definiteValuesOf} from '@salesforce/ts-types';
import {ensureDirSync, writeFileSync} from 'fs-extra';
import path from 'path';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import {tmp} from '../../../lib/tmp';

interface ConnectedAppCommand {
    label: string;
    fullName: string;
    oauthConfig?: {
        callbackurl?: string;
        scopes?: string[];
        isadminapproved?: string;
        certificate?: string;
    };
    profilename?: string[];
    permissionsetname?: string[];
    contactemail: string;
}

function createConnectedAppComponentString(
    {label, fullName, oauthConfig, contactemail, permissionsetname, profilename}: ConnectedApp
): string {
    const gt = '<';
    const result: string[] = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `${gt}ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">`
    ];
    result.push(`  <label>${label}</label>`);
    result.push(`  <fullName>${fullName}</fullName>`);
    if (oauthConfig && definiteValuesOf(oauthConfig).length) {
        result.push(`  <oauthConfig>`);
        if (oauthConfig.callbackurl) {
            result.push(`    <callbackUrl>${oauthConfig.callbackurl}</callbackUrl>`);
        }
        if (oauthConfig.isadminapproved) {
            result.push(`    <isAdminApproved>${oauthConfig.isadminapproved}</isAdminApproved>`);
        }
        if (oauthConfig.scopes && oauthConfig.scopes.length) {
            result.push(...oauthConfig.scopes.map(scope => `    <scopes>${scope}</scopes>`));
        }
        result.push(`  </oauthConfig>`);
    }
    if (permissionsetname) {
        result.push(...permissionsetname.map(it => `  <permissionSetName>${it}</permissionSetName>`));
    }
    if (profilename) {
        result.push(...profilename.map(it => `  <profileName>${it}</profileName>`));
    }
    result.push(`  <contactEmail>${contactemail}</contactEmail>`);
    result.push(`</ConnectedApp>`);
    return result.join('\n');
}

function packageXml(apiVersion: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>*</members>
    <name>ConnectedApp</name>
  </types>
  <version>${apiVersion}</version>
</Package>`;
}

const scopeOptions = [
    'Basic',
    'Api',
    'Web',
    'Full',
    'Chatter',
    'CustomApplications',
    'RefreshToken',
    'OpenID',
    'Profile',
    'Email',
    'Address',
    'Phone',
    'OfflineAccess',
    'CustomPermissions',
    'Wave',
    'Eclair'
];

export default class ConnectedAppCreate extends PonyCommand {

    public static description: string = ``;

    protected static flagsConfig: FlagsConfig = {
        label: flags.string({
            char: 'l',
            description: 'connected app label',
            required: true
        }),
        contactemail: flags.string({
            char: 'e',
            description: 'connected app contact email',
            required: true
        }),
        scopes: flags.string({
            char: 's',
            description: `comma-separated OAuth scopes; valid values are ${scopeOptions.join(', ')}`,
        }),
        callbackurl: flags.string({
            description: 'callback url',
        }),
        certificate: flags.string({
            char: 'c',
            description: 'path to certificate'
        }),
        targetdir: flags.string({
            char: 'd',
            description: 'target directory for connected app'
        }),
        noprompt: flags.boolean({
            char: 'p',
            description: 'do not prompt connected app deployment'
        })
    };

    protected static supportsUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const {
            scopes, label, contactemail,
            callbackurl, certificate, isadminapproved,
            profilename, permissionsetname, targetdir, noprompt
        } = this.flags;
        const scopesArray = scopes && scopes.split(',').map(it => it.trim());
        if (scopesArray) {
            const invalidScopes = scopesArray.filter(it => !scopeOptions.includes(it));
            if (invalidScopes.length) {
                throw Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
            }
        }
        const fullName = label.replace(' ', '_');
        const app = createConnectedAppComponentString({
            label,
            fullName,
            contactemail,
            oauthConfig: {
                scopes: scopesArray,
                isadminapproved,
                callbackurl,
                certificate
            },
            permissionsetname: permissionsetname && permissionsetname.split(',').map(it => it.trim()),
            profilename: profilename && profilename.split(',').map(it => it.trim())
        });
        if (targetdir) {
            ensureDirSync(targetdir);
            const file = path.join(targetdir, `${fullName}.connectedApp-meta.xml`);
            this.ux.log(`Writing to ${file}`);
            writeFileSync(file, app);
        }
        if (this.org) {
            const {apiVersion} = await sfdx.force({quiet: true});
            const {path: dirPath} = await tmp.dir();
            ensureDirSync(path.join(dirPath, `connectedApps/`));
            writeFileSync(path.join(dirPath, `connectedApps/${fullName}.connectedApp`), app);
            writeFileSync(path.join(dirPath, 'package.xml'), packageXml(apiVersion));
            const confirm = noprompt ||
                await this.ux.confirm(`Going to deploy to ${this.org.getUsername()}. Continue?`);
            if (confirm) {
                await sfdx.force.mdapi.deploy({
                    targetusername: this.org.getUsername(),
                    wait: 60,
                    deploydir: dirPath
                });
            }
        }
    }
}
