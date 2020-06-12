import {flags, FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {definiteValuesOf} from '@salesforce/ts-types';
import fs, {ensureDirSync, writeFileSync} from 'fs-extra';
import {EOL} from 'os';
import path from 'path';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import {tmp} from '../../../lib/tmp';

interface ConnectedApp {
    label: string;
    fullName: string;
    oauthConfig?: {
        callbackUrl?: string;
        scopes?: string[];
        certificate?: string;
    };
    contactEmail: string;
}

function createConnectedAppComponentString(
    {label, oauthConfig, contactEmail}: ConnectedApp
): string {
    const gt = '<';
    const result: string[] = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `${gt}ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">`
    ];
    result.push(`  <label>${label}</label>`);
    if (oauthConfig && definiteValuesOf(oauthConfig).length) {
        result.push(`  <oauthConfig>`);
        if (oauthConfig.callbackUrl) {
            result.push(`    <callbackUrl>${oauthConfig.callbackUrl}</callbackUrl>`);
        }
        if (oauthConfig.scopes && oauthConfig.scopes.length) {
            result.push(...oauthConfig.scopes.map(scope => `    <scopes>${scope}</scopes>`));
        }
        if (oauthConfig.certificate) {
            const cert = fs.readFileSync(oauthConfig.certificate).toString();
            result.push(`    <certificate>${cert}</certificate>`);
        }
        result.push(`  </oauthConfig>`);
    }
    result.push(`  <contactEmail>${contactEmail}</contactEmail>`);
    result.push(`</ConnectedApp>`);
    return result.join(EOL);
}

function packageXml(apiVersion: string, connectedAppName: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>${connectedAppName}</members>
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

export default class ConnectedAppCreateCommand extends PonyCommand {

    public static description: string = `create connected app
Set target org to deploy the app.
Set target directory to write the app.

Example:
    sfdx pony:connectedapp:create -u myOrg -l "My CI" -s Api,Web,RefreshToken -c /path/to/cert.crt -e john@acme.com --callbackurl http://localhost:1717/OauthRedirect
    `;

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
            description: 'directory for the connected app'
        }),
        noprompt: flags.boolean({
            char: 'p',
            description: 'do not prompt connected app deployment'
        })
    };

    protected static supportsUsername: boolean = true;

    public async run(): Promise<ConnectedApp> {
        const {
            scopes, label, contactemail, callbackurl, certificate, targetdir, noprompt
        } = this.flags;
        const scopesArray = scopes && scopes.split(',').map(it => it.trim());
        if (scopesArray) {
            const invalidScopes = scopesArray.filter(it => !scopeOptions.includes(it));
            if (invalidScopes.length) {
                throw Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
            }
        }
        const fullName = label.replace(' ', '_');
        const appObject: ConnectedApp = {
            label,
            fullName,
            contactEmail: contactemail,
            oauthConfig: {
                scopes: scopesArray,
                callbackUrl: callbackurl,
                certificate
            }
        };
        const app = createConnectedAppComponentString(appObject);
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
            writeFileSync(path.join(dirPath, 'package.xml'), packageXml(apiVersion, fullName));
            const confirm = noprompt ||
                await this.ux.confirm(`Going to deploy to ${this.org.getUsername()}. Continue? [y/n]`);
            if (confirm) {
                await sfdx.force.mdapi.deploy({
                    targetusername: this.org.getUsername(),
                    wait: 60,
                    deploydir: dirPath
                });
            }
        }
        return appObject;
    }
}
