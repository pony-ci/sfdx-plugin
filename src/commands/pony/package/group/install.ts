import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {registerUX, sfdx} from '../../../..';
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
        registerUX(this.ux);
        const project = await PonyProject.load();
        const group = await project.getPackageGroup(this.flags.group);
        let count: number = 0;
        for (const it of group.packages) {
            const versionNumber = it.subscriberPackageVersionNumber ? `@${it.subscriberPackageVersionNumber}` : '';
            this.ux.log(`Installing package ${it.subscriberPackageName}${versionNumber} [${it.subscriberPackageVersionId}] (${++count}/${group.packages.length})`);
            await sfdx.force.package.install({
                apexcompile: it.apexCompile,
                publishwait: it.publishWait,
                installationkey: it.installationKey,
                securitytype: it.securityType,
                upgradetype: it.upgradeType,
                package: it.subscriberPackageVersionId,
                wait: it.wait || 200,
                targetusername: this.flags.tagetusername,
                noprompt: true,
            });
        }
    }
}