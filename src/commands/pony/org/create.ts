import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {Org} from '@salesforce/core';
import {AnyJson, Dictionary, isJsonMap, isString, Optional} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {OrgCreateConfig, sfdx} from '../../..';
import {Environment} from '../../../lib/jobs';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';
import {hasProp} from '../../../type-guards/general';

const PONY_PRE_ORG_CREATE = 'pony:preOrgCreate';
const PONY_POST_ORG_CREATE = 'pony:postOrgCreate';

export default class OrgCreateCommand extends PonyCommand {

    public static description: string = `create a fully configured scratch org
    
Provide key=value pairs while creating a scratch org. When creating scratch orgs, --targetdevhubusername (-v) must be a Dev Hub org.
  
No ancestors, no namespace, duration days, definition file and username generation
options can be configured in pony config. 
Duration days flag will override the value in config (or default value if not specified in config).
  
Execution Flow:
    1) Set 'username' and 'devhubusername' env values if existing org is used (either targetusername flag or default org).
    2) Run '${PONY_PRE_ORG_CREATE}' job if existing org is not used.
    3) Run 'force:org:create' command and set 'username' and 'devhubusername' env values if existing org is not used.
    4) Run '${PONY_POST_ORG_CREATE}' job on success.
`;
    public static readonly varargs: boolean = true;

    protected static flagsConfig: FlagsConfig = {
        setdefaultusername: flags.boolean({
            char: 's',
            description: 'set the created org as the default username',
            required: false,
        }),
        setalias: flags.string({
            char: 'a',
            description: 'alias for the created org',
            required: false,
        }),
        durationdays: flags.integer({
            char: 'd',
            description: 'duration of the scratch org; override value in config (in days) (default: config value or 7, min:1, max:30)',
            required: false,
        }),
        ponyenv: flags.string({
            description: 'environment',
            default: Environment.stringify(Environment.createDefault()),
            required: true,
            hidden: true
        }),
        wait: flags.number({
            char: 'w',
            description: 'the streaming client socket timeout (in minutes)',
            required: false,
            min: 6,
            default: 6
        }),
    };

    protected static supportsUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<AnyJson> {
        let env = Environment.parse(this.flags.ponyenv);
        const project = await PonyProject.load();
        const {orgCreate = {}} = project.ponyConfig;
        let orgCreateResult: AnyJson = {};
        let org = await this.tryGetExistingOrg();
        if (org) {
            env.setEnv('username', org.getUsername());
            env.setEnv('devhubusername', (await org.getDevHubOrg())?.getUsername());
        } else {
            env = await project.hasJob(PONY_PRE_ORG_CREATE)
                ? await project.executeJobByName(PONY_PRE_ORG_CREATE, env)
                : env;
            this.ux.startSpinner('Creating scratch org');
            const args = this.getOrgCreateArgs(project, orgCreate);
            try {
                orgCreateResult = await sfdx.force.org.create(this.getOptions(orgCreate), args);
            } catch (e) {
                this.ux.stopSpinner('failed');
                throw e;
            }
            if (isJsonMap(orgCreateResult) && 'username' in orgCreateResult && isString(orgCreateResult.username)) {
                this.ux.stopSpinner();
                this.ux.log(`Successfully created scratch org: ${orgCreateResult.orgId}, username: ${orgCreateResult.username}`);
                org = await Org.create({aliasOrUsername: orgCreateResult.username});
                env.setEnv('username', org.getUsername());
                env.setEnv('devhubusername', (await org.getDevHubOrg())?.getUsername());
            }
        }
        if (await project.hasJob(PONY_POST_ORG_CREATE)) {
            await project.executeJobByName(PONY_POST_ORG_CREATE, env);
        }
        return orgCreateResult;
    }

    private async tryGetExistingOrg(): Promise<Optional<Org>> {
        const {targetusername, setalias} = this.flags;
        if (targetusername) {
            // if -u use the org
            return this.org;
        } else if (setalias) {
            // if -a try to find the org and prompt to use it
            const setAliasOrg = await this.resolveAlias(setalias);
            if (setAliasOrg) {
                const useExisting = await this.ux.confirm(`Use existing org from alias ${setalias} ${setAliasOrg.getOrgId()}, username: ${setAliasOrg.getUsername()}? [y/n]`);
                if (useExisting) {
                    return setAliasOrg;
                }
            }
        }
        if (this.org) {
            // if default org, prompt to use it
            const useExisting = await this.ux.confirm(`Use existing default org ${this.org.getOrgId()}, username: ${this.org.getUsername()}? [y/n]`);
            if (useExisting) {
                return this.org;
            }
        }
    }

    private async resolveAlias(aliasOrUsername: string): Promise<Optional<Org>> {
        try {
            return await Org.create({
                aliasOrUsername
            });
        } catch (e) {
            if (e.name === 'AuthInfoCreationError' || e.name === 'NamedOrgNotFound') {
                return undefined;
            }
            throw e;
        }
    }

    private getOptions(orgCreate: OrgCreateConfig): Dictionary<string | boolean> {
        const {
            noAncestors, noNamespace, durationDays,
            definitionFile = 'config/project-scratch-def.json'
        } = orgCreate;
        return {
            targetdevhubusername: this.flags.targetdevhubusername,
            nonamespace: noNamespace || false,
            noancestors: noAncestors || false,
            definitionfile: definitionFile,
            setdefaultusername: this.flags.setdefaultusername,
            setalias: this.flags.setalias,
            durationdays: this.flags.durationdays || durationDays || 7,
            wait: this.flags.wait
        };
    }

    private getOrgCreateArgs(project: PonyProject, orgCreate: OrgCreateConfig): string[] {
        const args = Object.entries(this.varargs || {})
            .filter(([_, right]) => isString(right))
            .map(leftRight => leftRight.join('='));
        const isUsernameSet = Object.keys(this.varargs || {}).map(it => it.toLowerCase()).includes('username');
        const generateUsername = orgCreate?.generateUsername !== false;
        if (!isUsernameSet && generateUsername) {
            args.push(`username=${this.getUsername(project.getNormalizedProjectName())}`);
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
        return `${projectName}${branch}-${d}@ponyci.com`;
    }
}
