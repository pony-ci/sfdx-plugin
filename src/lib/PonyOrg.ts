import {Org} from '@salesforce/core/lib/org';
import {Package} from '..';
import PonyProject from './PonyProject';
import {Flags, Opts, RunApexTestsOptions, sfdx} from './sfdx';
import {getUX} from './ux';

/**
 * Create PonyOrg instance.
 *
 * @param aliasOrUsername the required username
 */
export async function useOrg(aliasOrUsername: string): Promise<PonyOrg> {
    const ux = await getUX();
    const org = await PonyOrg.createPonyOrg({aliasOrUsername, isDevHub: false});
    const alias = await getAlias(org.getUsername());
    const aliasStr = alias ? ` (${alias})` : '';
    ux.log(`Using org: ${org.getUsername()}${aliasStr}`);
    return org;
}

export async function useDevhub(aliasOrUsername: string): Promise<PonyOrg> {
    const ux = await getUX();
    const org = await PonyOrg.createPonyOrg({aliasOrUsername, isDevHub: true});
    const alias = await getAlias(org.getUsername());
    const aliasStr = alias ? ` (${alias})` : '';
    ux.log(`Using devhub org: ${org.getUsername()}${aliasStr}`);
    return org;
}

export async function useOrgOrDefault(aliasOrUsername?: string): Promise<PonyOrg> {
    const username = aliasOrUsername || await getConfigValue('defaultusername');
    if (!username) {
        throw Error(`Must pass a username when creating PonyOrg and defaultusername is not set.`);
    }
    return useOrg(username);
}

export async function useDevhubOrDefault(aliasOrUsername?: string): Promise<PonyOrg> {
    const username = aliasOrUsername || await getConfigValue('defaultdevhubusername');
    if (!username) {
        throw Error(`Must pass a username when creating PonyOrg and defaultdevhubusername is not set.`);
    }
    return useDevhub(username);
}

async function getConfigValue(key: string): Promise<string | undefined> {
    return sfdx.force.config.get({quiet: true}, key)
        .then((result) => result.find(it => it.key === key)?.value || undefined);
}

async function getAlias(usernameOrAlias: string): Promise<string | undefined> {
    const aliases = await sfdx.force.alias.list({quiet: true});
    const entry = aliases.find(({alias, value}) => [alias, value].includes(usernameOrAlias));
    return entry ? entry.alias : undefined;
}

/**
 * Salesforce org connection.
 */
export class PonyOrg extends Org {

    private constructor(options: Org.Options) {
        super(options);
    }

    public static async createPonyOrg(options: Org.Options): Promise<PonyOrg> {
        const org = new PonyOrg(options);
        await org.init();
        return org;
    }

    public getUsername(): string {
        const username = super.getUsername();
        if (!username) {
            throw Error('Couldn\'t get org\'s username.');
        }
        return username;
    }

    /**
     * Run pony:source:push command.
     * Supports preSourcePush and postSourcePush.
     */
    public async pushSource(flags?: Flags, opts?: Opts): Promise<any> {
        return sfdx.pony.source.push({...flags, targetusername: this.getUsername()}, opts);
    }

    /**
     * Run pony:source:test command.
     * Execute sourceTest task.
     */
    public async testSource(flags?: Flags, opts?: Opts): Promise<any> {
        return sfdx.pony.source.test({...flags, targetusername: this.getUsername()}, opts);
    }

    /**
     * Install packages.
     */
    public async installPackages(groupName: string = 'default'): Promise<any> {
        const ux = await getUX();
        const project = await PonyProject.load();
        const group = await project.getPackageGroup(groupName);
        let count: number = 0;
        return group.packages.reduce((chain: Promise<any>, it: Package) => {
            return chain.then(() => {
                const versionNumber = it.subscriberPackageVersionNumber ? `@${it.subscriberPackageVersionNumber}` : '';
                ux.log(`Installing package ${it.subscriberPackageName}${versionNumber} [${it.subscriberPackageVersionId}] (${++count}/${group.packages.length})`);
                return sfdx.force.package.install({
                    apexcompile: it.apexCompile,
                    publishwait: it.publishWait,
                    installationkey: it.installationKey,
                    securitytype: it.securityType,
                    upgradetype: it.upgradeType,
                    package: it.subscriberPackageVersionId,
                    wait: it.wait || 200,
                    targetusername: this.getUsername(),
                    noprompt: true,
                });
            });
        }, Promise.resolve());
    }

    /**
     * Import currency.
     *
     * The json currencies has to be located in 'data/CurrencyType.json' or specify a path to json file.
     *
     * @param currencyFile the file with currency types
     */
    public async importCurrency(currencyFile: string = 'data/CurrencyType.json'): Promise<any> {
        const ux = await getUX();
        ux.log(`Importing currencies ${currencyFile}`);
        return sfdx.force.data.tree.import({
            targetusername: this.getUsername(),
            sobjecttreefiles: currencyFile,
        });
    }

    /**
     * Update user.
     *
     * @param values an object containing values to update.
     * Key as a field api name and value as field value.
     */
    public async updateUser(values: { [key: string]: string }): Promise<any> {
        const ux = await getUX();
        const valuesString: string = Object.entries(values)
            .map(([key, value]) => `${key}='${value}'`)
            .join(' ');
        ux.log(`Updating user ${this.getUsername()} with values "${valuesString}"`);
        return sfdx.force.data.record.update({
            targetusername: this.getUsername(),
            sobjecttype: 'User',
            where: `Username=${this.getUsername()}`,
            values: valuesString,
        });
    }

    /**
     * Assign permission set.
     *
     * @param permsetname the name of the permission set to assign
     * @param onbehalfof a list of usernames or aliases to assign the permission set to
     */
    public async assignPermissionSet(permsetname: string, onbehalfof?: string[]): Promise<any> {
        const ux = await getUX();
        if (onbehalfof && onbehalfof.length === 0) {
            ux.warn(`Skipping ${permsetname} permission set assignment. Empty on behalf of.`);
            return Promise.resolve();
        }
        const onbehalfofString = onbehalfof ? ` on behalf of ${onbehalfof.join(', ')}` : '';
        ux.log(`Assigning permission set ${permsetname}${onbehalfofString} to ${this.getUsername()}`);
        return sfdx.force.user.permset.assign({
            targetusername: this.getUsername(),
            permsetname,
            onbehalfof,
        });
    }

    public async assignProfile(profileName: string): Promise<any> {
        if (!profileName) {
            throw Error('Specify profile name in order to assign it');
        }
        const ux = await getUX();
        const project = await PonyProject.load();
        ux.log(`Going to assign '${profileName}' profile to ${this.getUsername()}`);
        const tmpUserName = `${project.getProjectName().slice(0, 10)}-${new Date().valueOf()}@pony.tmp`;
        ux.log(`Creating temporary user ${tmpUserName} who will assign the profile`);
        await sfdx.force.user.create({
            targetusername: this.getUsername(),
        }, [
            `Username=${tmpUserName}`,
            `profileName=${profileName}`
        ]);
        ux.log('Querying profile id');
        const profileQueryResult = await sfdx.force.data.soql.query({
            targetusername: this.getUsername(),
            query: `SELECT Id FROM Profile WHERE Name = '${profileName}'`
        });
        if (!profileQueryResult || !profileQueryResult.records.length) {
            throw Error(`Profile '${profileName}' not found`);
        }
        const profileId = profileQueryResult.records[0].Id;
        ux.log(`Assigning profile ${profileId}`);
        await sfdx.force.data.record.update({
            targetusername: tmpUserName,
            sobjecttype: 'User',
            where: `Username='${this.getUsername()}'`,
            values: `ProfileId='${profileId}'`
            // values: `ProfileId='${profileId}' Country='Czech Republic' City='Prague'"`
        });
        ux.log('Deactivating temporary user');
        await sfdx.force.data.record.update({
            targetusername: this.getUsername(),
            sobjecttype: 'User',
            where: `Username='${tmpUserName}'`,
            values: `IsActive=false'`
        });
    }

    /**
     * Print backdoor login url.
     */
    public async printLoginUrl(): Promise<any> {
        const ux = await getUX();
        ux.log('Printing login url');
        return sfdx.force.org.open({
            targetusername: this.getUsername(),
            urlonly: true,
        });
    }

    /**
     * Execute anonymous apex scripts.
     *
     * The script has to be located in 'scripts/apex/<script>.apex' or has to be path to script.
     *
     * @param script the script name or path
     */
    public async executeApex(script: string): Promise<any> {
        const ux = await getUX();
        const apexcodefile: string = script.includes('.')
            ? script : `data/apex/${script}.apex`;
        ux.log(`Executing anonymous apex: ${apexcodefile}`);
        return sfdx.force.apex.execute({
            apexcodefile,
            targetusername: this.getUsername(),
        });
    }

    /**
     *
     * assigning permission sets (e.g., permsets=ps1,ps2),
     * generating a password (e.g., generatepassword=true), and setting User sObject fields.
     *
     * @param users the users array
     * @param definitionfile file path to a user definition
     */
    public async createUsers(
        users: { [key: string]: string | boolean | number }[],
        definitionfile?: string
    ): Promise<any> {
        const ux = await getUX();
        ux.log(`Creating users from definition file: ${definitionfile}`);
        for (const u of users) {
            const args = Object.keys(u).map((fieldName) => `${fieldName}="${u[fieldName]}"`);
            ux.log(`Creating user with values: ${args}`);
            await sfdx.force.user.create({
                targetusername: this.getUsername(),
                definitionfile
            }, args);
        }
    }

    /**
     * Display org's api limits.
     */
    public async displayApiLimits(): Promise<any> {
        const ux = await getUX();
        ux.log(`Displaying api limits for ${this.getUsername()}`);
        return sfdx.force.limits.api.display({
            targetusername: this.getUsername(),
        });
    }

    /**
     * Set this org as default dev hub.
     */
    public async setDefaultDevhubUsername(): Promise<any> {
        const ux = await getUX();
        ux.log(`Setting default dev hub username: ${this.getUsername()}`);
        return sfdx.force.config.set({}, [`defaultdevhubusername=${this.getUsername()}`]);
    }

    /**
     * Set this org as default dev hub.
     */
    public async setDefaultUsername(): Promise<any> {
        const ux = await getUX();
        ux.log(`Setting default username: ${this.getUsername()}`);
        return sfdx.force.config.set({}, [`defaultusername=${this.getUsername()}`]);
    }

    /**
     * Run apex tests.
     */
    public async runApexTests(options: RunApexTestsOptions = {}): Promise<any> {
        const ux = await getUX();
        ux.log(`Running apex tests: ${this.getUsername()}`);
        return sfdx.force.apex.test.run({
            wait: 200,
            ...options,
            targetusername: this.getUsername(),
        });
    }

    /**
     * Delete org.
     */
    public async deleteOrg(): Promise<any> {
        const ux = await getUX();
        ux.log(`Deleting org: ${this.getUsername()}`);
        const options: any = {
            targetusername: this.getUsername(),
            noprompt: true,
        };
        const devhub = await this.getDevHubOrg();
        if (devhub) {
            options.targetdevhubusername = devhub.getUsername();
        }
        return sfdx.force.org.delete(options);
    }

    /**
     * Logout org.
     */
    public async logout(): Promise<any> {
        const ux = await getUX();
        ux.log(`Logging out org: ${this.getUsername()}`);
        return sfdx.force.auth.logout({
            targetusername: this.getUsername(),
            noprompt: true,
        });
    }

    public async deployMetadata(options: any = {}): Promise<any> {
        const ux = await getUX();
        ux.log(`Deploying metadata to org: ${this.getUsername()}`);
        await sfdx.force.mdapi.deploy({
            wait: 30,
            ...options,
            targetusername: this.getUsername(),
        });
    }

    public async deploySource(options: any = {}): Promise<any> {
        const ux = await getUX();
        ux.log(`Deploying source to org: ${this.getUsername()}`);
        await sfdx.force.source.deploy({
            wait: 30,
            ...options,
            targetusername: this.getUsername(),
        });
    }
}
