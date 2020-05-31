import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {Org} from '@salesforce/core';
import {AnyJson, Dictionary, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {OrgCreateConfig, sfdx} from '../../..';
import {Environment} from '../../../lib/jobs';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

const PONY_PRE_ORG_CREATE = 'pony:preOrgCreate';
const PONY_POST_ORG_CREATE = 'pony:postOrgCreate';

export default class OrgCreateCommand extends PonyCommand {

    public static description: string = `create a fully configured scratch org
Flow:
1) Set 'username' and 'devhubusername' env values if targetusername flag is set.
2) Run '${PONY_PRE_ORG_CREATE}' job if targetusername flag is not set.
3) Run 'force:org:create' command job and set 'username' and 'devhubusername' env values if targetusername flag is not set.
4) Run '${PONY_POST_ORG_CREATE}' job.
`;
    public static readonly varargs: boolean = true;

    protected static flagsConfig: FlagsConfig = {
        definitionfile: flags.filepath({
            char: 'f',
            description: 'path to an org definition file',
            default: 'config/project-scratch-def.json'
        }),
        nonamespace: flags.boolean({
            char: 'n', description: 'create the scratch org with no namespace'
        }),
        noancestors: flags.boolean({
            char: 'c',
            description: 'do not include second-generation package ancestors in the scratch org'
        }),
        setdefaultusername: flags.boolean({
            char: 's', description: 'set the created org as the default username'
        }),
        setalias: flags.string({
            char: 'a', description: 'alias for the created org'
        }),
        durationdays: flags.integer({
            char: 'd', description: 'duration of the scratch org (in days)'
        }),
        ponyenv: flags.string({
            description: 'environment',
            default: Environment.stringify(Environment.create()),
            hidden: true
        })
    };

    protected static supportsUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = true;
    protected static requiresProject: boolean = true;

    private get options(): Dictionary<string> {
        return {
            targetdevhubusername: this.flags.targetdevhubusername,
            definitionfile: this.flags.definitionfile,
            nonamespace: this.flags.nonamespace,
            noancestors: this.flags.noancestors,
            setdefaultusername: this.flags.setdefaultusername,
            setalias: this.flags.setalias,
            durationdays: this.flags.durationdays,
        };
    }

    public async run(): Promise<AnyJson> {
        let env = Environment.parse(this.flags.ponyenv);
        const project = await PonyProject.load();
        const {orgCreate = {}} = await project.getPonyConfig();
        let org: Optional<Org> = this.org;
        let orgCreateResult: AnyJson = {};
        if (org) {
            env.setEnv('username', org.getUsername());
            env.setEnv('devhubusername', (await org.getDevHubOrg())?.getUsername());
        } else {
            env = await project.hasJob(PONY_PRE_ORG_CREATE)
                ? await project.executeJobByName(PONY_PRE_ORG_CREATE, env)
                : env;
            this.ux.log('Creating scratch org');
            const args = this.getOrgCreateArgs(project, orgCreate);
            orgCreateResult = await sfdx.force.org.create(this.options, args);
            if (isJsonMap(orgCreateResult) && 'username' in orgCreateResult && isString(orgCreateResult.username)) {
                org = await Org.create({aliasOrUsername: orgCreateResult.username});
                env.setEnv('username', org.getUsername());
                env.setEnv('devhubusername', (await org.getDevHubOrg())?.getUsername());
            } else {
                throw Error(`Unexpected 'force:org:create' result: ${JSON.stringify(orgCreateResult)}`);
            }
        }
        if (await project.hasJob(PONY_POST_ORG_CREATE)) {
            await project.executeJobByName(PONY_POST_ORG_CREATE, env);
        }
        return orgCreateResult;
    }

    private getOrgCreateArgs(project: PonyProject, orgCreate: OrgCreateConfig): string[] {
        const args = Object.entries(this.varargs || {})
            .filter(([_, right]) => isString(right))
            .map(leftRight => leftRight.join('='));
        const isUsernameSet = Object.keys(this.varargs || {}).map(it => it.toLowerCase()).includes('username');
        const generateUsername = orgCreate?.generateUsername !== false;
        if (!isUsernameSet && generateUsername) {
            args.push(`username=${this.getUsername(project.getProjectName())}`);
        }
        return args;
    }

    private getUsername(projectName: string): string {
        let branch = '';
        const gitHeadFile = '.git/HEAD';
        if (fs.existsSync(gitHeadFile)) {
            const content = fs.readFileSync(gitHeadFile).toString();
            branch = content
                .substr(content.lastIndexOf('/'))
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ' ').trim()
                .replace(/\s+/g, '-')
                .substr(0, 10);
            branch = branch[branch.length - 1] === '-' ? branch.slice(0, -1) : branch;
            branch = `-${branch}`;
        }
        let d = `${new Date().valueOf()}`;
        d = branch.length ? d.slice(-6) : d.slice(-12);
        return `${projectName.substr(0, 10)}${branch}-${d}@ponyci.com`;
    }
}
