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
const command_1 = require("@salesforce/command");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path = __importStar(require("path"));
const __1 = require("../../../..");
const PonyCommand_1 = __importDefault(require("../../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../../lib/PonyProject"));
const standardSubscriberPackageNames = [
    'Contacts Today',
    'Data.com Assessment',
    'Knowledge Base Dashboards & Reports',
    'Process Automation Specialist Email Templates',
    'SFDC Channel Order',
    'Salesforce Adoption Dashboards',
    'Salesforce Connected Apps',
    'Salesforce and Chatter Apps',
    'Salesforce.com CRM Dashboards',
    'Survey Force',
    'Trailhead Project'
];
function mapInstalledPackageToPackage(pkg) {
    return {
        SubscriberPackageId: pkg.SubscriberPackageId,
        SubscriberPackageName: pkg.SubscriberPackageName,
        SubscriberPackageNamespace: pkg.SubscriberPackageNamespace,
        SubscriberPackageVersionId: pkg.SubscriberPackageVersionId,
        SubscriberPackageVersionName: pkg.SubscriberPackageVersionName,
        SubscriberPackageVersionNumber: pkg.SubscriberPackageVersionNumber,
    };
}
let PackageGroupExportCommand = /** @class */ (() => {
    class PackageGroupExportCommand extends PonyCommand_1.default {
        async run() {
            var _a;
            const { group } = this.flags;
            const project = await PonyProject_1.default.load();
            this.ux.startSpinner('Retrieving installed packages.');
            const [installedPackages] = await Promise.all([
                __1.sfdx.force.package.installed.list({
                    quiet: true,
                    targetusername: (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername()
                })
            ]);
            this.ux.stopSpinner();
            const packages = await this.filterAndMapPackages(installedPackages);
            const dir = path.join(project.projectDir, 'data/groups/');
            const file = path.join(dir, 'packages.json');
            fs_extra_1.default.ensureDirSync(dir);
            const pkgs = fs_extra_1.default.existsSync(file) ? fs_extra_1.default.readJSONSync(file) : {};
            fs_extra_1.default.writeJsonSync(file, Object.assign(Object.assign({}, pkgs), { [group]: packages }), { spaces: 2 });
        }
        filterAndMapPackages(installedPackages) {
            const packages = installedPackages.map(mapInstalledPackageToPackage);
            const filtered = [];
            for (const pkg of packages) {
                if (standardSubscriberPackageNames.includes(pkg.SubscriberPackageName)) {
                    this.ux.log(`Removing standard package from group: ${this.packageToString(pkg)}`);
                }
                else {
                    this.ux.log(`Add package to group: ${this.packageToString(pkg)}`);
                    filtered.push(pkg);
                }
            }
            this.ux.warn(`Standard packages were removed automatically, 
please check the group and remove any other standard packages manually.`);
            return filtered;
        }
        packageToString({ SubscriberPackageName, SubscriberPackageVersionNumber }) {
            return `${SubscriberPackageName} (${SubscriberPackageVersionNumber})`;
        }
    }
    PackageGroupExportCommand.description = `export a package group from configured org for scratch org creation
    
Exported package group is an ordered list of packages that can be installed with the 'sfdx pony:package:group:install' command.
    `;
    PackageGroupExportCommand.supportsUsername = true;
    PackageGroupExportCommand.supportsDevhubUsername = false;
    PackageGroupExportCommand.requiresProject = true;
    PackageGroupExportCommand.flagsConfig = {
        group: command_1.flags.string({
            char: 'n',
            description: 'name of the package group',
            longDescription: 'name of the package group',
            default: 'default'
        })
    };
    return PackageGroupExportCommand;
})();
exports.default = PackageGroupExportCommand;
//# sourceMappingURL=export.js.map