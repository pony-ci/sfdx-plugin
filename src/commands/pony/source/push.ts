import {flags, FlagsConfig} from '@salesforce/command';
import {registerUX, sfdx, useOrgOrDefault} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
import {TaskContext} from '../../../lib/taskExecution';

const DEFAULT_SRC_WAIT_MINUTES: number = 100;
const MIN_SRC_WAIT_MINUTES: number = 1;

export default class SourcePushCommand extends PonyCommand {
    public static readonly description: string = `push source to a scratch org from the project

preSourcePush:
    run always
    target org can be accessed through 'org' argument
    
postSourcePush:
    run always
    target org can be accessed through 'org' argument
    push status can be accessed through 'success' argument
`;
    public static readonly showProgress: boolean = false;

    public static readonly supportsUsername: boolean = true;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = true;

    public static readonly flagsConfig: FlagsConfig = {
        forceoverwrite: flags.boolean({
            char: 'f',
            description: 'ignore conflict warnings and overwrite changes to scratch org',
            longDescription: 'ignore conflict warnings and overwrite changes to scratch org',
            required: false
        }),
        ignorewarnings: flags.boolean({
            char: 'g',
            description: 'deploy changes even if warnings are generated',
            longDescription: 'deploy changes even if warnings are generated',
            required: false
        }),
        wait: flags.number({
            char: 'w',
            description: 'wait time for command to finish in minutes',
            longDescription: 'wait time for command to finish in minutes',
            required: false,
            default: DEFAULT_SRC_WAIT_MINUTES,
            min: MIN_SRC_WAIT_MINUTES
        })
    };

    public async run(): Promise<void> {
        registerUX(this.ux);
        const project = await PonyProject.load();
        const org = await useOrgOrDefault(this.flags.targetusername);
        const ctx = TaskContext.create();
        await project.runTaskIfDefined('preSourcePush', {org}, ctx);
        let success = true;
        try {
            this.ux.log('Pushing source');
            await sfdx.force.source.push({
                forceoverwrite: this.flags.forceoverwrite,
                ignorewarnings: this.flags.ignorewarnings,
                targetusername: org.getUsername(),
                wait: this.flags.wait
            });
            await ctx.restoreBackupFiles(org.getUsername());
        } catch (e) {
            success = false;
            throw e;
        } finally {
            await project.runTaskIfDefined('postSourcePush', {org, success}, ctx);
        }
    }
}