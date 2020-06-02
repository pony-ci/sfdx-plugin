import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import chalk from 'chalk';
import {sfdx} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';

export default class PackageGroupInstallCommand extends PonyCommand {

    public static description: string = `install package group

Create package group with 'sfdx pony:package:group:export' command.    
`;

    protected static flagsConfig: FlagsConfig = {
        group: flags.string({
            char: 'g',
            description: 'name of the package group',
            longDescription: 'name of the package group',
            default: 'default'
        })
    };

    protected static requiresUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = false;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const project = await PonyProject.load();
        const packages = await project.getPackageGroup(this.flags.group);
        const username = this.org?.getUsername();
        let count: number = 0;
        for (const it of packages) {
            const versionNumber = it.subscriberPackageVersionNumber ? `@${it.subscriberPackageVersionNumber}` : '';
            const label = chalk.blueBright(`${it.subscriberPackageName}${versionNumber}`);
            this.ux.startSpinner(`Installing package ${label} [${it.subscriberPackageVersionId}] (${++count}/${packages.length})`);
            const result = await sfdx.force.package.install({
                apexcompile: it.apexCompile,
                publishwait: it.publishWait,
                installationkey: it.installationKey,
                securitytype: it.securityType,
                upgradetype: it.upgradeType,
                package: it.subscriberPackageVersionId,
                wait: it.wait || 200,
                targetusername: username,
                quiet: true,
                noprompt: true,
            });
            if (result.Status === 'SUCCESS') {
                this.ux.stopSpinner();
            } else {
                this.ux.stopSpinner(result.Status);
                this.ux.error('Package installation either failed or has not finished.');
                throw Error(JSON.stringify(result));
            }
        }
    }
}
