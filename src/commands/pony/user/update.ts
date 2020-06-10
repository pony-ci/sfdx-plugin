import {flags, FlagsConfig} from '@salesforce/command';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';

// @ts-ignore
export default class UserUpdateCommand extends PonyCommand {

    public static readonly description: string = `update admin user`;

    public static readonly requiresUsername: boolean = true;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        values: flags.string({
            char: 'v',
            description: 'a list of <fieldName>=<value> pairs to search for',
            required: true,
        })
    };

    public async run(): Promise<void> {
        const {values} = this.flags;
        const username = this.org?.getUsername();
        const devhub = await this.org?.getDevHubOrg();
        const devhubUsername = devhub?.getUsername();
        const {id: userId} = await sfdx.force.user.display({
            targetusername: username,
            targetdevhubusername: devhubUsername
        });
        await sfdx.force.data.record.update({
            targetusername: this.flags.targetusername,
            sobjecttype: 'User',
            sobjectid: userId,
            values
        });
    }
}
