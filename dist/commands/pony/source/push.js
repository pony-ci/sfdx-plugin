"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const constants_1 = __importDefault(require("salesforce-alm/dist/lib/core/constants"));
const __1 = require("../../..");
const FilesBackup_1 = require("../../../lib/FilesBackup");
const jobs_1 = require("../../../lib/jobs");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
const PONY_PRE_SOURCE_PUSH = 'pony:preSourcePush';
const PONY_POST_SOURCE_PUSH = 'pony:postSourcePush';
let SourcePushCommand = /** @class */ (() => {
    class SourcePushCommand extends PonyCommand_1.default {
        async run() {
            var _a;
            const project = await PonyProject_1.default.load();
            const username = (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername();
            const backup = FilesBackup_1.FilesBackup.create(project.projectDir);
            backup.clean();
            let env = jobs_1.Environment.parse(this.flags.ponyenv);
            if (await project.hasJob(PONY_PRE_SOURCE_PUSH)) {
                env = await project.executeJobByName(PONY_PRE_SOURCE_PUSH, env);
            }
            this.ux.log('Pushing source...');
            let pushSuccess = false;
            try {
                await __1.sfdx.force.source.push({
                    forceoverwrite: this.flags.forceoverwrite,
                    ignorewarnings: this.flags.ignorewarnings,
                    targetusername: username,
                    wait: this.flags.wait
                });
                pushSuccess = true;
            }
            catch (e) {
                throw Error('Push failed.');
            }
            finally {
                this.ux.log(`Pushing source... ${pushSuccess ? 'done' : 'failed'}`);
                await backup.restoreBackupFiles(pushSuccess ? username : undefined);
            }
            if (await project.hasJob(PONY_POST_SOURCE_PUSH)) {
                await project.executeJobByName(PONY_POST_SOURCE_PUSH, env);
            }
        }
    }
    SourcePushCommand.description = `push source to a scratch org from the project

Execution Flow:
    1) Run '${PONY_PRE_SOURCE_PUSH}' job if existing org is not used.
    2) Run 'force:source:push' command.
    3) Run '${PONY_POST_SOURCE_PUSH}' job on success.
    `;
    SourcePushCommand.supportsUsername = true;
    SourcePushCommand.requiresProject = true;
    SourcePushCommand.flagsConfig = {
        forceoverwrite: command_1.flags.boolean({
            char: 'f',
            description: 'ignore conflict warnings and overwrite changes to scratch org',
            longDescription: 'ignore conflict warnings and overwrite changes to scratch org',
            required: false
        }),
        ignorewarnings: command_1.flags.boolean({
            char: 'g',
            description: 'deploy changes even if warnings are generated',
            longDescription: 'deploy changes even if warnings are generated',
            required: false
        }),
        wait: command_1.flags.number({
            char: 'w',
            description: 'wait time for command to finish in minutes',
            longDescription: 'wait time for command to finish in minutes',
            required: false,
            default: constants_1.default.DEFAULT_SRC_WAIT_MINUTES,
            min: constants_1.default.MIN_SRC_WAIT_MINUTES
        }),
        ponyenv: command_1.flags.string({
            description: 'environment',
            default: jobs_1.Environment.stringify(jobs_1.Environment.default()),
            hidden: true
        })
    };
    return SourcePushCommand;
})();
exports.default = SourcePushCommand;
//# sourceMappingURL=push.js.map