"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = require("os");
const __1 = require("../../..");
const PonyCommand_1 = __importDefault(require("../../../lib/PonyCommand"));
const tmp_1 = require("../../../lib/tmp");
const supportedGroupTypes = [
    'AllCustomerPortal',
    'ChannelProgramGroup',
    'CollaborationGroup',
    'Manager',
    'ManagerAndSubordinatesInternal',
    'Organization',
    'PRMOrganization',
    'Queue',
    'Regular',
    'Role',
    'RoleAndSubordinates',
    'RoleAndSubordinatesInternal',
    'Territory',
    'TerritoryAndSubordinates'
];
let GroupAssignCommand = /** @class */ (() => {
    class GroupAssignCommand extends PonyCommand_1.default {
        async run() {
            const { targetusername } = this.flags;
            const userOrGroupId = await this.getUserOrGroupId();
            const groups = await this.getGroupRecords();
            const groupMembers = groups.map((g, idx) => this.createGroupMemberRecord(userOrGroupId, g, idx));
            const { name } = tmp_1.tmp.fileSync({ postfix: '.json' });
            fs_extra_1.default.writeJSONSync(name, { records: groupMembers });
            await __1.sfdx.force.data.tree.import({
                targetusername,
                sobjecttreefiles: name
            });
        }
        createGroupMemberRecord(userOrGroupId, group, groupIdx) {
            return {
                attributes: {
                    type: 'GroupMember',
                    referenceId: `GroupMemberRef${groupIdx}`
                },
                UserOrGroupId: userOrGroupId,
                GroupId: group.Id
            };
        }
        async getGroupRecords() {
            const { targetusername, type, group } = this.flags;
            const groups = group.split(',');
            if (!groups.length) {
                throw Error('List of groups cannot be empty.');
            }
            const groupNamesString = groups.map(it => `'${it}'`).join(',');
            const typeWhereClause = type ? ` Type = '${type}'` : '';
            const query = `SELECT Id, Name, DeveloperName FROM Group WHERE${typeWhereClause} AND DeveloperName IN (${groupNamesString})`;
            const { records } = await __1.sfdx.force.data.soql.query({
                quiet: true,
                targetusername,
                query
            });
            if (records.length !== groups.length) {
                const groupsNotFound = groups.filter(g => !records.find(({ DeveloperName }) => DeveloperName !== g));
                throw Error(`Some groups not found: ${groupsNotFound}`);
            }
            return records;
        }
        async getUserOrGroupId() {
            const { targetusername, userorggroup } = this.flags;
            const getUserId = async () => {
                const { id } = await __1.sfdx.force.user.display({
                    quiet: true,
                    targetusername
                });
                return id;
            };
            return userorggroup || getUserId();
        }
    }
    GroupAssignCommand.description = `assign public group

Developer Guide:
    * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_group.htm
    * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_groupmember.htm
    
Supported Group types:
${supportedGroupTypes.map(it => `   * ${it}`).join(os_1.EOL)}
`;
    GroupAssignCommand.examples = [
        `$ sfdx pony:group:assign -g My_Queue`,
        `$ sfdx pony:group:assign -t Queue -g Fist_Queue,Second_Queue`,
        `$ sfdx pony:group:assign -t Queue -g My_Queue --userorgroup 0053N000002EP0zQAG`,
    ];
    GroupAssignCommand.flagsConfig = {
        type: command_1.flags.enum({
            char: 't',
            options: supportedGroupTypes,
            description: 'type of the Group'
        }),
        group: command_1.flags.string({
            char: 'g',
            description: 'developer names of the Group',
            required: true,
        }),
        userorgroup: command_1.flags.string({
            description: 'ID of the User or Group that is a direct member of the group (default: target username)'
        })
    };
    GroupAssignCommand.requiresUsername = true;
    GroupAssignCommand.supportsDevhubUsername = false;
    GroupAssignCommand.requiresProject = true;
    return GroupAssignCommand;
})();
exports.default = GroupAssignCommand;
//# sourceMappingURL=assign.js.map