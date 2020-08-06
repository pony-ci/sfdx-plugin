"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const __1 = require("../../../..");
const PonyCommand_1 = __importDefault(require("../../../../lib/PonyCommand"));
const PonyProject_1 = __importDefault(require("../../../../lib/PonyProject"));
let ProfileAssignCommand = /** @class */ (() => {
    class ProfileAssignCommand extends PonyCommand_1.default {
        async run() {
            const { profile, assigner } = this.flags;
            const project = await PonyProject_1.default.load();
            const assignerUsername = await this.getAssignerUsername(project);
            this.ux.log(`${assignerUsername} is going to assign '${profile}' profile to ${this.getTargetUsername()}.`);
            const profileId = await this.getProfileId();
            await this.assignProfile(assignerUsername, profileId);
            if (!assigner) {
                await this.deactivateAndLogoutAssigner(assignerUsername);
            }
        }
        async getProfileId() {
            const { profile, targetusername } = this.flags;
            this.ux.log(`Querying ${profile} profile id`);
            const queryResult = await __1.sfdx.force.data.soql.query({
                targetusername,
                query: `SELECT Id FROM Profile WHERE Name = '${profile}'`
            });
            if (!queryResult || !queryResult.records.length) {
                throw Error(`Profile ${profile} not found.`);
            }
            return queryResult.records[0].Id;
        }
        async assignProfile(assignerUsername, profileId) {
            this.ux.log(`Assigning profile ${profileId} to ${this.getTargetUsername()}`);
            await __1.sfdx.force.data.record.update({
                targetusername: assignerUsername,
                sobjecttype: 'User',
                where: `Username='${this.getTargetUsername()}'`,
                values: `ProfileId='${profileId}'`
            });
        }
        async deactivateAndLogoutAssigner(assignerUsername) {
            const { targetusername } = this.flags;
            this.ux.log(`Deactivating assigner.`);
            await __1.sfdx.force.data.record.update({
                targetusername,
                sobjecttype: 'User',
                where: `Username='${assignerUsername}'`,
                values: `IsActive=false'`
            });
            this.ux.log(`Logging out assigner.`);
            await __1.sfdx.force.auth.logout({
                noprompt: true,
                targetusername
            });
        }
        async getAssignerUsername(project) {
            const { assigner, targetusername } = this.flags;
            if (assigner) {
                return assigner;
            }
            const assignerUsername = `${project.getNormalizedProjectName()}-${new Date().valueOf()}@pony.assigner`;
            this.log(`Creating a user ${assignerUsername} who will assign the profile.`);
            await __1.sfdx.force.user.create({
                targetusername,
            }, [
                `Username=${assignerUsername}`,
                `profileName=System Administrator`
            ]);
            return assignerUsername;
        }
        getTargetUsername() {
            var _a;
            const { targetusername } = this.flags;
            const username = (_a = this.org) === null || _a === void 0 ? void 0 : _a.getUsername();
            if (!username) {
                throw Error(`Username not found: ${targetusername}`);
            }
            return username;
        }
    }
    ProfileAssignCommand.description = `assign a profile to a user

Assigner is a user who will assign the profile. 
If not specified, a user is created and after assignment deactivated.

On behalf of is a list of users whom to assign the profile. 
If not specified, the profile is assigned to target username.
`;
    ProfileAssignCommand.flagsConfig = {
        profile: command_1.flags.string({
            char: 'p',
            description: 'name of the profile',
            required: true
        }),
        assigner: command_1.flags.string({
            char: 'a',
            description: 'user who will assign the profile, this user must be authorized'
        })
    };
    ProfileAssignCommand.requiresUsername = true;
    return ProfileAssignCommand;
})();
exports.default = ProfileAssignCommand;
//# sourceMappingURL=assign.js.map