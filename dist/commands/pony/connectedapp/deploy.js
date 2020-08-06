"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sfdxFlags_1 = require("@salesforce/command/lib/sfdxFlags");
const ts_types_1 = require("@salesforce/ts-types");
const fs_extra_1 = __importStar(require("fs-extra"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const __1 = require("../../..");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const tmp_1 = require("../../../lib/tmp");
function createConnectedAppComponentString({ label, oauthConfig, contactEmail }) {
    const gt = '<';
    const result = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `${gt}ConnectedApp xmlns="http://soap.sforce.com/2006/04/metadata">`
    ];
    result.push(`  <label>${label}</label>`);
    if (oauthConfig && ts_types_1.definiteValuesOf(oauthConfig).length) {
        result.push(`  <oauthConfig>`);
        if (oauthConfig.callbackUrl) {
            result.push(`    <callbackUrl>${oauthConfig.callbackUrl}</callbackUrl>`);
        }
        if (oauthConfig.scopes && oauthConfig.scopes.length) {
            result.push(...oauthConfig.scopes.map(scope => `    <scopes>${scope}</scopes>`));
        }
        if (oauthConfig.certificate) {
            const cert = fs_extra_1.default.readFileSync(oauthConfig.certificate).toString();
            result.push(`    <certificate>${cert}</certificate>`);
        }
        result.push(`  </oauthConfig>`);
    }
    result.push(`  <contactEmail>${contactEmail}</contactEmail>`);
    result.push(`</ConnectedApp>`);
    return result.join(os_1.EOL);
}
function packageXml(apiVersion, connectedAppName) {
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
let ConnectedAppDeployCommand = /** @class */ (() => {
    class ConnectedAppDeployCommand extends PonyCommand_1.default {
        async run() {
            const { scopes, label, contactemail, callbackurl, certificate, targetdir, noprompt } = this.flags;
            const scopesArray = scopes && scopes.split(',').map(it => it.trim());
            if (scopesArray) {
                const invalidScopes = scopesArray.filter(it => !scopeOptions.includes(it));
                if (invalidScopes.length) {
                    throw Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
                }
            }
            const fullName = label.replace(' ', '_');
            const appObject = {
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
                fs_extra_1.ensureDirSync(targetdir);
                const file = path_1.default.join(targetdir, `${fullName}.connectedApp-meta.xml`);
                this.ux.log(`Writing to ${file}`);
                fs_extra_1.writeFileSync(file, app);
            }
            if (this.org) {
                const { apiVersion } = await __1.sfdx.force({ quiet: true });
                const { path: dirPath } = await tmp_1.tmp.dir();
                fs_extra_1.ensureDirSync(path_1.default.join(dirPath, `connectedApps/`));
                fs_extra_1.writeFileSync(path_1.default.join(dirPath, `connectedApps/${fullName}.connectedApp`), app);
                fs_extra_1.writeFileSync(path_1.default.join(dirPath, 'package.xml'), packageXml(apiVersion, fullName));
                const confirm = noprompt ||
                    await this.ux.confirm(`Going to deploy to ${this.org.getUsername()}. Continue? [y/n]`);
                if (confirm) {
                    await __1.sfdx.force.mdapi.deploy({
                        targetusername: this.org.getUsername(),
                        wait: 60,
                        deploydir: dirPath
                    });
                }
            }
            return appObject;
        }
    }
    ConnectedAppDeployCommand.description = `create connected app

Set target directory to write the connected app.

Example:
    sfdx pony:connectedapp:create -u myOrg -l "My CI" -s Api,Web,RefreshToken -c /path/to/cert.crt -e john@acme.com --callbackurl http://localhost:1717/OauthRedirect
    `;
    ConnectedAppDeployCommand.flagsConfig = {
        label: sfdxFlags_1.flags.string({
            char: 'l',
            description: 'connected app label',
            required: true
        }),
        contactemail: sfdxFlags_1.flags.string({
            char: 'e',
            description: 'connected app contact email',
            required: true
        }),
        scopes: sfdxFlags_1.flags.string({
            char: 's',
            description: `comma-separated OAuth scopes; valid values are ${scopeOptions.join(', ')}`,
            required: false
        }),
        callbackurl: sfdxFlags_1.flags.string({
            description: 'callback url',
            required: false
        }),
        certificate: sfdxFlags_1.flags.string({
            char: 'c',
            description: 'path to certificate',
            required: false
        }),
        targetdir: sfdxFlags_1.flags.string({
            char: 'd',
            description: 'directory for the connected app',
            required: false
        }),
        noprompt: sfdxFlags_1.flags.boolean({
            char: 'p',
            description: 'do not prompt connected app deployment',
            default: false,
            required: false
        })
    };
    ConnectedAppDeployCommand.supportsUsername = true;
    return ConnectedAppDeployCommand;
})();
exports.default = ConnectedAppDeployCommand;
//# sourceMappingURL=deploy.js.map