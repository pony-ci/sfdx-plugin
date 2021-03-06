import {flags, FlagsConfig} from '@salesforce/command';
import constants from 'salesforce-alm/dist/lib/core/constants';
import {sfdx} from '../../..';
import {FilesBackup} from '../../../lib/FilesBackup';
import {Environment} from '../../../lib/jobs';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

const PONY_PRE_SOURCE_PUSH = 'pony:preSourcePush';
const PONY_POST_SOURCE_PUSH = 'pony:postSourcePush';

export default class SourcePushCommand extends PonyCommand {

    public static readonly description: string = `push source to a scratch org from the project

Execution Flow:
    1) Run '${PONY_PRE_SOURCE_PUSH}' job if existing org is not used.
    2) Run 'force:source:push' command.
    3) Run '${PONY_POST_SOURCE_PUSH}' job on success.
    `;

    public static readonly supportsUsername: boolean = true;
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
            default: constants.DEFAULT_SRC_WAIT_MINUTES,
            min: constants.MIN_SRC_WAIT_MINUTES
        }),
        ponyenv: flags.string({
            description: 'environment',
            hidden: true
        })
    };

    public async run(): Promise<void> {
        const project = await PonyProject.load();
        const username = this.org?.getUsername();
        const backup = FilesBackup.create(project.projectDir);
        backup.clean();
        const {ponyenv} = this.flags;
        let env = Environment.load(ponyenv);
        if (project.hasJob(PONY_PRE_SOURCE_PUSH)) {
            env = await project.executeJobByName(PONY_PRE_SOURCE_PUSH, env);
        }
        this.ux.log('Pushing source...');
        let pushSuccess = false;
        try {
            await sfdx.force.source.push({
                forceoverwrite: this.flags.forceoverwrite,
                ignorewarnings: this.flags.ignorewarnings,
                targetusername: username,
                wait: this.flags.wait
            });
            pushSuccess = true;
        } catch (e) {
            throw Error('Push failed.');
        } finally {
            this.ux.log(`Pushing source... ${pushSuccess ? 'done' : 'failed'}`);
            await backup.restoreBackupFiles(pushSuccess ? username : undefined);
        }
        if (project.hasJob(PONY_POST_SOURCE_PUSH)) {
            await project.executeJobByName(PONY_POST_SOURCE_PUSH, env);
        }
    }
}
