import {flags, FlagsConfig} from '@salesforce/command';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

// @ts-ignore
export default class UserCreateCommand extends PonyCommand {
    public static readonly description: string = `create user`;

    public static readonly requiresUsername: boolean = true;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        name: flags.string({
            char: 'n',
            description: 'user definition name',
            required: true
        })
    };

    public async run(): Promise<void> {
        const {name} = this.flags;
        const project = await PonyProject.load();
        const {users = {}} = await project.getPonyConfig();
        if (!(name in users)) {
            throw Error(`No user definition for ${name}`);
        }
        const {
            setAlias: setalias,
            definitionFile: definitionfile,
            usernamePrefix,
            Username
        } = users[name];
        const args = Object.entries(users[name]).filter(([key]) => ![
            'definitionFile',
            'usernamePrefix'
        ].includes(key)).map(([key, value]) => `${key}=${value}`);
        if (!Username) {
            const prefix = usernamePrefix ? `${usernamePrefix}-` : '';
            args.push(`Username=${prefix}${project.getNormalizedProjectName()}-${new Date().valueOf()}@pony.user`);
        }
        const targetusername = this.org?.getUsername();
        const targetdevhub = await this.org?.getDevHubOrg();
        const targetdevhubusername = targetdevhub?.getUsername();
        await sfdx.force.user.create({
            targetusername,
            targetdevhubusername,
            setalias,
            definitionfile,
        }, args);
    }
}