import {OutputArgs} from '@oclif/parser';
import {flags, FlagsConfig} from '@salesforce/command';
import {readFileSync} from 'fs-extra';
import yaml from 'yaml';
import {getLogger, Jobs, validateConfig} from '../..';
import {Environment, executeJob} from '../../lib/jobs';
import PonyCommand from '../../lib/PonyCommand';

export default class RunCommand extends PonyCommand {
    public static readonly description: string = `run job`;

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = false;

    public static readonly flagsConfig: FlagsConfig = {
        onlyifdefined: flags.boolean({
            description: 'execute the job only if defined',
            default: false
        })
    };

    public static readonly args: any = [
        {name: 'job', required: true}
    ];

    public async run(): Promise<void> {
        const {onlyifdefined} = this.flags;
        const {job} = this.args;
        const config = readFileSync('/home/ondrej/projects/pony-ci/sfdx-plugin/template.yml').toString();
        const yml = yaml.parse(config);
        const validation = validateConfig(yml);
        if (validation) {
            throw validation;
        }
        const jobs: Jobs = yml.jobs || {};
        if (jobs[job]) {
            await executeJob(jobs, jobs[job], Environment.create());
        } else if (!onlyifdefined) {
            throw Error(`Job not found: ${job}`);
        }
    }
}
