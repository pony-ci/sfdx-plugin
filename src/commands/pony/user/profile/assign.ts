import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {sfdx} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';

export default class ProfileAssignCommand extends PonyCommand {

    public static description: string = `assign a profile to a user

Assigner is a user who will assign the profile. 
If not specified, a user is created and after assignment deactivated.

On behalf of is a list of users whom to assign the profile. 
If not specified, the profile is assigned to target username.
`;

    protected static flagsConfig: FlagsConfig = {
        profile: flags.string({
            char: 'p',
            description: 'name of the profile',
            required: true
        }),
        assigner: flags.string({
            char: 'a',
            description: 'user who will assign the profile, this user must be authorized'
        })
    };

    protected static requiresUsername: boolean = true;

    public async run(): Promise<void> {
        const {profile, assigner} = this.flags;
        const project = await PonyProject.load();
        const assignerUsername = await this.getAssignerUsername(project);
        this.ux.log(`${assignerUsername} is going to assign '${profile}' profile to ${this.getTargetUsername()}.`);
        const profileId = await this.getProfileId();
        await this.assignProfile(assignerUsername, profileId);
        if (!assigner) {
            await this.deactivateAndLogoutAssigner(assignerUsername);
        }
    }

    private async getProfileId(): Promise<string> {
        const {profile, targetusername} = this.flags;
        this.ux.log(`Querying ${profile} profile id`);
        const queryResult = await sfdx.force.data.soql.query({
            targetusername,
            query: `SELECT Id FROM Profile WHERE Name = '${profile}'`
        });
        if (!queryResult || !queryResult.records.length) {
            throw Error(`Profile ${profile} not found.`);
        }
        return queryResult.records[0].Id;
    }

    private async assignProfile(assignerUsername: string, profileId: string): Promise<void> {
        this.ux.log(`Assigning profile ${profileId} to ${this.getTargetUsername()}`);
        await sfdx.force.data.record.update({
            targetusername: assignerUsername,
            sobjecttype: 'User',
            where: `Username='${this.getTargetUsername()}'`,
            values: `ProfileId='${profileId}'`
        });
    }

    private async deactivateAndLogoutAssigner(assignerUsername: string): Promise<void> {
        const {targetusername} = this.flags;
        this.ux.log(`Deactivating assigner.`);
        await sfdx.force.data.record.update({
            targetusername,
            sobjecttype: 'User',
            where: `Username='${assignerUsername}'`,
            values: `IsActive=false'`
        });
        this.ux.log(`Logging out assigner.`);
        await sfdx.force.auth.logout({
            noprompt: true,
            targetusername
        });
    }

    private async getAssignerUsername(project: PonyProject): Promise<string> {
        const {assigner, targetusername} = this.flags;
        if (assigner) {
            return assigner;
        }
        const assignerUsername = `${project.getNormalizedProjectName()}-${new Date().valueOf()}@pony.assigner`;
        this.log(`Creating a user ${assignerUsername} who will assign the profile.`);
        await sfdx.force.user.create({
            targetusername,
        },                           [
            `Username=${assignerUsername}`,
            `profileName=System Administrator`
        ]);
        return assignerUsername;
    }

    private getTargetUsername(): string {
        const {targetusername} = this.flags;
        const username = this.org?.getUsername();
        if (!username) {
            throw Error(`Username not found: ${targetusername}`);
        }
        return username;
    }
}
