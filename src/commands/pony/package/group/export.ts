import {flags, FlagsConfig} from '@salesforce/command';
import {Package, sfdx} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';

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

interface InstalledPackage {
    Id: string;
    SubscriberPackageId: string;
    SubscriberPackageName: string;
    SubscriberPackageNamespace: string;
    SubscriberPackageVersionId: string;
    SubscriberPackageVersionName: string;
    SubscriberPackageVersionNumber: string;
}

function mapInstalledPackageToPackage(pkg: InstalledPackage): Package {
    return {
        SubscriberPackageId: pkg.SubscriberPackageId,
        SubscriberPackageName: pkg.SubscriberPackageName,
        SubscriberPackageNamespace: pkg.SubscriberPackageNamespace,
        SubscriberPackageVersionId: pkg.SubscriberPackageVersionId,
        SubscriberPackageVersionName: pkg.SubscriberPackageVersionName,
        SubscriberPackageVersionNumber: pkg.SubscriberPackageVersionNumber,
    };
}

export default class PackageGroupExportCommand extends PonyCommand {
    public static readonly description: string = `export a package group from configured org for scratch org creation
    
Exported package group is an ordered list of packages that can be installed with the 'sfdx pony:package:group:install' command.
    `;

    public static readonly supportsUsername: boolean = true;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        group: flags.string({
            char: 'n',
            description: 'name of the package group',
            longDescription: 'name of the package group',
            default: 'default'
        })
    };

    public async run(): Promise<void> {
        this.ux.startSpinner('Retrieving installed packages.');
        const [installedPackages]: InstalledPackage[][] = await Promise.all([
            sfdx.force.package.installed.list({
                quiet: true,
                targetusername: this.org?.getUsername()
            })
        ]);
        this.ux.stopSpinner();
        const packages = await this.filterAndMapPackages(installedPackages);
        this.logPackages(packages);
    }

    private filterAndMapPackages(installedPackages: InstalledPackage[]): Package[] {
        const packages: Package[] = installedPackages.map(mapInstalledPackageToPackage);
        const filtered: Package[] = [];
        for (const pkg of packages) {
            if (standardSubscriberPackageNames.includes(pkg.SubscriberPackageName)) {
                this.ux.log(`Removing standard package from group: ${this.packageToString(pkg)}`);
            } else {
                this.ux.log(`Add package to group: ${this.packageToString(pkg)}`);
                filtered.push(pkg);
            }
        }
        return filtered;
    }

    private packageToString({SubscriberPackageName, SubscriberPackageVersionNumber}: Package): string {
        return `${SubscriberPackageName} (${SubscriberPackageVersionNumber})`;
    }

    private logPackages(packages: Package[]): void {
        this.ux.warn(`
Some standard groups were removed automatically, please check the group and remove any other standard packages manually. 
Add following configuration to your pony-config.yml and run 'sfdx pony:package:group:install' to install the package group:`);
        this.ux.log(`
packages:
    default:
${packages.map(toPackageYamlString).join('')}`);
    }
}

const toPackageYamlString = (pkg): string => {
    let result = '';
    Object.entries(pkg).forEach(([key, value], idx) => {
        result += '        ';
        result += idx === 0 ? '-   ' : '    ';
        result += `${key}: ${value}\n`;
    });
    return result;
};
