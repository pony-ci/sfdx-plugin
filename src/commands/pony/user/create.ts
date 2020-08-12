import {flags, FlagsConfig} from '@salesforce/command';
import {VarargsConfig} from '@salesforce/command/lib/sfdxCommand';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

// @ts-ignore
export default class UserCreateCommand extends PonyCommand {

    public static readonly description: string = `create a user by name defined in config`;

    public static readonly requiresUsername: boolean = true;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        setalias: flags.string({
            char: 'a',
            description: 'alias for the created org',
            required: false,
        }),
        prefix: flags.string({
            char: 'p',
            description: 'username prefix',
            required: false
        }),
        definitionfile: flags.string({
            char: 'f',
            description: 'file path to a user definition',
            required: false,
        })
    };

    protected static varargs: VarargsConfig = {required: false};
    protected static strict: boolean = false;

    public async run(): Promise<void> {
        const varargs = this.varargs || {};
        const project = await PonyProject.load();
        const d = new Date();
        const {prefix, definitionfile, setalias} = this.flags;
        const args = Object.entries(varargs)
            .map(([key, value]) => `${key}=${value}`);
        if (!('Username' in varargs)) {
            const usernamePrefix = prefix ? `${prefix}-` : '';
            args.push(`Username=${usernamePrefix}${project.getNormalizedProjectName()}-${d.valueOf()}@pony.user`);
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
