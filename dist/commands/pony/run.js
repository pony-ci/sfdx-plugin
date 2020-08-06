"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const jobs_1 = require("../../lib/jobs");
const PonyCommand_1 = __importDefault(require("../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../lib/PonyProject"));
let RunCommand = /** @class */ (() => {
    class RunCommand extends PonyCommand_1.default {
        async run() {
            const { onlyifdefined } = this.flags;
            const { job } = this.args;
            const project = await PonyProject_1.default.load();
            const config = project.ponyConfig;
            const jobs = config.jobs || {};
            if (project.hasJob(job)) {
                await jobs_1.executeJobByName(jobs, job, jobs_1.Environment.default());
            }
            else if (!onlyifdefined) {
                throw Error(`Job not found: ${job}`);
            }
        }
    }
    RunCommand.description = `run job defined in config`;
    RunCommand.supportsUsername = false;
    RunCommand.supportsDevhubUsername = false;
    RunCommand.requiresProject = false;
    RunCommand.flagsConfig = {
        onlyifdefined: command_1.flags.boolean({
            description: 'execute the job only if defined, otherwise throw error',
            default: false
        })
    };
    RunCommand.args = [
        { name: 'job', required: true }
    ];
    return RunCommand;
})();
exports.default = RunCommand;
//# sourceMappingURL=run.js.map