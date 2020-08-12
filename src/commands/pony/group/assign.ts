import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {AnyJson} from '@salesforce/ts-types';
import fs from 'fs-extra';
import {EOL} from 'os';
import {sfdx} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import {tmp} from '../../../lib/tmp';

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

interface Group {
    Id: string;
    Name: string;
}

export default class GroupAssignCommand extends PonyCommand {

    public static description: string = `assign public group

Developer Guide:
    * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_group.htm
    * https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_objects_groupmember.htm
    
Supported Group types:
${supportedGroupTypes.map(it => `   * ${it}`).join(EOL)}
`;

    public static examples: string[] = [
        `$ sfdx pony:group:assign -g My_Queue`,
        `$ sfdx pony:group:assign -t Queue -g Fist_Queue,Second_Queue`,
        `$ sfdx pony:group:assign -t Queue -g My_Queue --userorgroup 0053N000002EP0zQAG`,
    ];

    protected static flagsConfig: FlagsConfig = {
        type: flags.enum({
            char: 't',
            options: supportedGroupTypes,
            description: 'type of the Group'
        }),
        group: flags.string({
            char: 'g',
            description: 'developer names of the Group',
            required: true,
        }),
        userorgroup: flags.string({
            description: 'ID of the User or Group that is a direct member of the group (default: target username)'
        })
    };

    protected static requiresUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = false;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const {targetusername} = this.flags;
        const userOrGroupId = await this.getUserOrGroupId();
        const groups = await this.getGroupRecords();
        const groupMembers = groups.map((g, idx) => this.createGroupMemberRecord(userOrGroupId, g, idx));
        const {name} = tmp.fileSync({postfix: '.json'});
        fs.writeJSONSync(name, {records: groupMembers});
        await sfdx.force.data.tree.import({
            targetusername,
            sobjecttreefiles: name
        });
    }

    private createGroupMemberRecord(userOrGroupId: string, group: Group, groupIdx: number): AnyJson {
        return {
            attributes: {
                type: 'GroupMember',
                referenceId: `GroupMemberRef${groupIdx}`
            },
            UserOrGroupId: userOrGroupId,
            GroupId: group.Id
        };
    }

    private async getGroupRecords(): Promise<Group[]> {
        const {targetusername, type, group} = this.flags;
        const groups = group.split(',');
        if (!groups.length) {
            throw Error('List of groups cannot be empty.');
        }
        const groupNamesString = groups.map(it => `'${it}'`).join(',');
        const typeWhereClause = type ? ` Type = '${type}'` : '';
        const query = `SELECT Id, Name, DeveloperName FROM Group WHERE${typeWhereClause} AND DeveloperName IN (${groupNamesString})`;
        const {records} = await sfdx.force.data.soql.query({
            quiet: true,
            targetusername,
            query
        });
        if (records.length !== groups.length) {
            const groupsNotFound = groups.filter(g => !records.find(({DeveloperName}) => DeveloperName !== g));
            throw Error(`Some groups not found: ${groupsNotFound}`);
        }
        return records;
    }

    private async getUserOrGroupId(): Promise<string> {
        const {targetusername, userorggroup} = this.flags;
        const getUserId = async () => {
            const {id} = await sfdx.force.user.display({
                quiet: true,
                targetusername
            });
            return id;
        };
        return userorggroup || getUserId();
    }
}
