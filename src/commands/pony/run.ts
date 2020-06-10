import {Command} from '@oclif/config';
import {flags, FlagsConfig} from '@salesforce/command';
import {Environment, executeJobByName} from '../../lib/jobs';
import PonyCommand from '../../lib/PonyCommand';
import PonyProject from '../../lib/PonyProject';
import Arg = Command.Arg;

export default class RunCommand extends PonyCommand {
    public static readonly description: string = `run job`;

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = false;

    public static readonly flagsConfig: FlagsConfig = {
        onlyifdefined: flags.boolean({
            description: 'execute the job only if defined, otherwise throw error',
            default: false
        })
    };

    public static readonly args: Arg[] = [
        {name: 'job', required: true}
    ];

    public async run(): Promise<void> {
        const {onlyifdefined} = this.flags;
        const {job} = this.args;
        const project = await PonyProject.load();
        const config = project.ponyConfig;
        const jobs = config.jobs || {};
        if (project.hasJob(job)) {
            await executeJobByName(jobs, job, Environment.default());
        } else if (!onlyifdefined) {
            throw Error(`Job not found: ${job}`);
        }
    }
}
