import {flags, FlagsConfig} from '@salesforce/command';
import fs from 'fs-extra';
import path from 'path';
import {Package, sfdx} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';

const STANDARD_SUBSCRIBER_PACKAGE_NAMES = [
    'Contacts Today',
    'Data.com Assessment',
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
        subscriberPackageId: pkg.SubscriberPackageId,
        subscriberPackageName: pkg.SubscriberPackageName,
        subscriberPackageNamespace: pkg.SubscriberPackageNamespace,
        subscriberPackageVersionId: pkg.SubscriberPackageVersionId,
        subscriberPackageVersionName: pkg.SubscriberPackageVersionName,
        subscriberPackageVersionNumber: pkg.SubscriberPackageVersionNumber,
    };
}

export default class PackageGroupExportCommand extends PonyCommand {
    public static readonly description: string = `export package group from configured org for scratch org creation
    
Exported package group is a ordered list of packages that can be installed with 'sfdx pony:package:group:install' command.
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
        const projectDir = process.cwd();
        const packagesDir = path.join(projectDir, 'data/packages');
        fs.ensureDirSync(packagesDir);
        this.ux.startSpinner('Retrieving installed packages.');
        const [installedPackages]: InstalledPackage[][] = await Promise.all([
            sfdx.force.package.installed.list({
                quiet: true,
                targetusername: this.org?.getUsername()
            })
        ]);
        this.ux.stopSpinner();
        await this.configurePackages(packagesDir, installedPackages);
    }

    private async configurePackages(packagesDir: string, installedPackages: InstalledPackage[]): Promise<void> {
        const packages: Package[] = installedPackages.map(mapInstalledPackageToPackage);
        const filtered: Package[] = [];
        for (const pkg of packages) {
            if (STANDARD_SUBSCRIBER_PACKAGE_NAMES.includes(pkg.subscriberPackageName)) {
                this.ux.log(`Removing standard package from group: ${this.packageToString(pkg)}`);
            } else {
                this.ux.log(`Add: ${this.packageToString(pkg)}`);
                filtered.push(pkg);
            }
        }
        const file = path.join(packagesDir, `${this.flags.group}.json`);
        fs.writeJSONSync(file, {packages: filtered}, {spaces: 2});
        this.ux.log(`Package group written to ${file}`);
        this.ux.warn('Some standard groups were removed automatically, please check the group and remove any other standard packages manually.');
    }

    private packageToString({subscriberPackageName, subscriberPackageVersionNumber}: Package): string {
        return `${subscriberPackageName} (${subscriberPackageVersionNumber})`;
    }
}