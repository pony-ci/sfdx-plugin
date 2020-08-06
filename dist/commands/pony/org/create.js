"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const core_1 = require("@salesforce/core");
const ts_types_1 = require("@salesforce/ts-types");
const fs_extra_1 = __importDefault(require("fs-extra"));
const __1 = require("../../..");
const jobs_1 = require("../../../lib/jobs");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
const PONY_PRE_ORG_CREATE = 'pony:preOrgCreate';
const PONY_POST_ORG_CREATE = 'pony:postOrgCreate';
let OrgCreateCommand = /** @class */ (() => {
    class OrgCreateCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b;
            let env = jobs_1.Environment.parse(this.flags.ponyenv);
            const project = await PonyProject_1.default.load();
            const { orgCreate = {} } = project.ponyConfig;
            let orgCreateResult = {};
            let org = await this.tryGetExistingOrg();
            if (org) {
                env.setEnv('username', org.getUsername());
                env.setEnv('devhubusername', (_a = (await org.getDevHubOrg())) === null || _a === void 0 ? void 0 : _a.getUsername());
            }
            else {
                env = await project.hasJob(PONY_PRE_ORG_CREATE)
                    ? await project.executeJobByName(PONY_PRE_ORG_CREATE, env)
                    : env;
                this.ux.startSpinner('Creating scratch org');
                const args = this.getOrgCreateArgs(project, orgCreate);
                try {
                    orgCreateResult = await __1.sfdx.force.org.create(this.getOptions(orgCreate), args);
                }
                catch (e) {
                    this.ux.stopSpinner('failed');
                    throw e;
                }
                if (ts_types_1.isJsonMap(orgCreateResult) && 'username' in orgCreateResult && ts_types_1.isString(orgCreateResult.username)) {
                    this.ux.stopSpinner();
                    this.ux.log(`Successfully created scratch org: ${orgCreateResult.orgId}, username: ${orgCreateResult.username}`);
                    org = await core_1.Org.create({ aliasOrUsername: orgCreateResult.username });
                    env.setEnv('username', org.getUsername());
                    env.setEnv('devhubusername', (_b = (await org.getDevHubOrg())) === null || _b === void 0 ? void 0 : _b.getUsername());
                }
            }
            if (await project.hasJob(PONY_POST_ORG_CREATE)) {
                await project.executeJobByName(PONY_POST_ORG_CREATE, env);
            }
            return orgCreateResult;
        }
        async tryGetExistingOrg() {
            const { targetusername, setalias } = this.flags;
            if (targetusername) {
                // if -u use the org
                return this.org;
            }
            else if (setalias) {
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
        async resolveAlias(aliasOrUsername) {
            try {
                return await core_1.Org.create({
                    aliasOrUsername
                });
            }
            catch (e) {
                if (e.name === 'AuthInfoCreationError' || e.name === 'NamedOrgNotFound') {
                    return undefined;
                }
                throw e;
            }
        }
        getOptions(orgCreate) {
            const { noAncestors, noNamespace, durationDays, definitionFile = 'config/project-scratch-def.json' } = orgCreate;
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
        getOrgCreateArgs(project, orgCreate) {
            const args = Object.entries(this.varargs || {})
                .filter(([_, right]) => ts_types_1.isString(right))
                .map(leftRight => leftRight.join('='));
            const isUsernameSet = Object.keys(this.varargs || {}).map(it => it.toLowerCase()).includes('username');
            const generateUsername = (orgCreate === null || orgCreate === void 0 ? void 0 : orgCreate.generateUsername) !== false;
            if (!isUsernameSet && generateUsername) {
                args.push(`username=${this.getUsername(project.getNormalizedProjectName())}`);
            }
            return args;
        }
        getUsername(projectName) {
            let branch = '';
            const gitHeadFile = '.git/HEAD';
            if (fs_extra_1.default.existsSync(gitHeadFile)) {
                const content = fs_extra_1.default.readFileSync(gitHeadFile).toString();
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
    OrgCreateCommand.description = `create a fully configured scratch org
    
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
    OrgCreateCommand.varargs = true;
    OrgCreateCommand.flagsConfig = {
        setdefaultusername: command_1.flags.boolean({
            char: 's',
            description: 'set the created org as the default username',
            required: false,
        }),
        setalias: command_1.flags.string({
            char: 'a',
            description: 'alias for the created org',
            required: false,
        }),
        durationdays: command_1.flags.integer({
            char: 'd',
            description: 'duration of the scratch org; override value in config (in days) (default: config value or 7, min:1, max:30)',
            required: false,
        }),
        ponyenv: command_1.flags.string({
            description: 'environment',
            default: jobs_1.Environment.stringify(jobs_1.Environment.default()),
            required: true,
            hidden: true
        }),
        wait: command_1.flags.number({
            char: 'w',
            description: 'the streaming client socket timeout (in minutes)',
            required: false,
            min: 6,
            default: 6
        }),
    };
    OrgCreateCommand.supportsUsername = true;
    OrgCreateCommand.supportsDevhubUsername = true;
    OrgCreateCommand.requiresProject = true;
    return OrgCreateCommand;
})();
exports.default = OrgCreateCommand;
//# sourceMappingURL=create.js.map