"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const chalk_1 = __importDefault(require("chalk"));
const __1 = require("../../../..");
const PonyCommand_1 = __importDefault(require("../../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../../lib/PonyProject"));
let PackageGroupInstallCommand = /** @class */ (() => {
    class PackageGroupInstallCommand extends PonyCommand_1.default {
        async run() {
            var _a;
            const project = await PonyProject_1.default.load();
            const packages = await project.getPackageGroup(this.flags.group);
            const username = (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername();
            let count = 0;
            for (const it of packages) {
                const versionNumber = it.SubscriberPackageVersionNumber ? `@${it.SubscriberPackageVersionNumber}` : '';
                const label = chalk_1.default.blueBright(`${it.SubscriberPackageName}${versionNumber}`);
                this.ux.startSpinner(`Installing package ${label} [${it.SubscriberPackageVersionId}] (${++count}/${packages.length})`);
                const result = await __1.sfdx.force.package.install({
                    apexcompile: it.apexCompile,
                    publishwait: it.publishWait,
                    installationkey: it.installationKey,
                    securitytype: it.securityType,
                    upgradetype: it.upgradeType,
                    package: it.SubscriberPackageVersionId,
                    wait: it.wait || 200,
                    targetusername: username,
                    quiet: true,
                    noprompt: true,
                });
                if (result.Status === 'SUCCESS') {
                    this.ux.stopSpinner();
                }
                else {
                    this.ux.stopSpinner(result.Status);
                    this.ux.error('Package installation either failed or has not finished.');
                    throw Error(JSON.stringify(result));
                }
            }
        }
    }
    PackageGroupInstallCommand.description = `install a package group

To create a package group run the 'sfdx pony:package:group:export' command.    
`;
    PackageGroupInstallCommand.flagsConfig = {
        group: command_1.flags.string({
            char: 'g',
            description: 'name of the package group',
            longDescription: 'name of the package group',
            default: 'default'
        })
    };
    PackageGroupInstallCommand.requiresUsername = true;
    PackageGroupInstallCommand.supportsDevhubUsername = false;
    PackageGroupInstallCommand.requiresProject = true;
    return PackageGroupInstallCommand;
})();
exports.default = PackageGroupInstallCommand;
//# sourceMappingURL=install.js.map