"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const __1 = require("../../..");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../lib/PonyProject"));
// @ts-ignore
let UserCreateCommand = /** @class */ (() => {
    class UserCreateCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b;
            const varargs = this.varargs || {};
            const project = await PonyProject_1.default.load();
            const d = new Date();
            const { prefix, definitionfile, setalias } = this.flags;
            const args = Object.entries(varargs)
                .map(([key, value]) => `${key}=${value}`);
            if (!('Username' in varargs)) {
                const usernamePrefix = prefix ? `${prefix}-` : '';
                args.push(`Username=${usernamePrefix}${project.getNormalizedProjectName()}-${d.valueOf()}@pony.user`);
            }
            const targetusername = (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername();
            const targetdevhub = await ((_b = this.org) === null || _b === void 0 ? void 0 : _b.getDevHubOrg());
            const targetdevhubusername = targetdevhub === null || targetdevhub === void 0 ? void 0 : targetdevhub.getUsername();
            console.log(args);
            await __1.sfdx.force.user.create({
                targetusername,
                targetdevhubusername,
                setalias,
                definitionfile,
            }, args);
        }
    }
    UserCreateCommand.description = `create a user by name defined in config`;
    UserCreateCommand.requiresUsername = true;
    UserCreateCommand.requiresProject = true;
    UserCreateCommand.flagsConfig = {
        setalias: command_1.flags.string({
            char: 'a',
            description: 'alias for the created org',
            required: false,
        }),
        prefix: command_1.flags.string({
            char: 'p',
            description: 'username prefix',
            required: false
        }),
        definitionfile: command_1.flags.string({
            char: 'f',
            description: 'file path to a user definition',
            required: false,
        })
    };
    UserCreateCommand.varargs = { required: false };
    UserCreateCommand.strict = false;
    return UserCreateCommand;
})();
exports.default = UserCreateCommand;
//# sourceMappingURL=create.js.map