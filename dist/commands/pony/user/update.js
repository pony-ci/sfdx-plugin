"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const __1 = require("../../..");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
// @ts-ignore
let UserUpdateCommand = /** @class */ (() => {
    class UserUpdateCommand extends PonyCommand_1.default {
        async run() {
            var _a, _b;
            const { values } = this.flags;
            const username = (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername();
            const devhub = await ((_b = this.org) === null || _b === void 0 ? void 0 : _b.getDevHubOrg());
            const devhubUsername = devhub === null || devhub === void 0 ? void 0 : devhub.getUsername();
            const { id: userId } = await __1.sfdx.force.user.display({
                targetusername: username,
                targetdevhubusername: devhubUsername
            });
            await __1.sfdx.force.data.record.update({
                targetusername: this.flags.targetusername,
                sobjecttype: 'User',
                sobjectid: userId,
                values
            });
        }
    }
    UserUpdateCommand.description = `update target user`;
    UserUpdateCommand.requiresUsername = true;
    UserUpdateCommand.requiresProject = true;
    UserUpdateCommand.flagsConfig = {
        values: command_1.flags.string({
            char: 'v',
            description: 'a list of <fieldName>=<value> pairs to search for',
            required: true,
        })
    };
    return UserUpdateCommand;
})();
exports.default = UserUpdateCommand;
//# sourceMappingURL=update.js.map