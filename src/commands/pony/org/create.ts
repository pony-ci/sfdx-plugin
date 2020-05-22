import {sfdx} from '@pony-ci/sfdx-node';
import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {Dictionary, Optional} from '@salesforce/ts-types';
import {PonyOrg, registerUX, useOrg} from '../../..';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

export default class OrgCreateCommand extends PonyCommand {

    public static description: string = `create scratch org from your pony definition
A new org is not created if the targetusername is set. The provided org is used instead.

preOrgCreate:
    run only if the targetusername is no set
        
postOrgCreate:
    run always, even if the org creation fails (distinguished with 'success' argument)
    created org (or the provided one) can be accessed through 'org' argument
`;

    protected static flagsConfig: FlagsConfig = {
        setalias: flags.string({
            char: 'a', description: 'alias for the created org'
        }),
        noancestors: flags.boolean({
            char: 'c',
            description: 'do not include second-generation package ancestors in the scratch org'
        }),
        durationdays: flags.integer({
            char: 'd', description: 'duration of the scratch org (in days)'
        }),
        definitionfile: flags.filepath({
            char: 'f',
            default: 'config/project-scratch-def.json',
            description: 'path to an org definition file'
        }),
        nonamespace: flags.boolean({
            char: 'n', description: 'create the scratch org with no namespace'
        }),
        setdefaultusername: flags.boolean({
            char: 's', description: 'set the created org as the default username'
        })
    };

    protected static supportsUsername: boolean = true;
    protected static supportsDevhubUsername: boolean = true;
    protected static requiresProject: boolean = true;

    private get options(): Dictionary<string> {
        return {
            setalias: this.flags.setalias,
            noancestors: this.flags.noancestors,
            durationdays: this.flags.durationdays,
            definitionfile: this.flags.definitionfile || 'config/project-scratch-def.json',
            nonamespace: this.flags.nonamespace,
            setdefaultusername: this.flags.setdefaultusername,
            targetdevhubusername: this.flags.targetdevhubusername,
        };
    }

    public async run(): Promise<Optional<PonyOrg>> {
        registerUX(this.ux);
        const project = await PonyProject.load();
        let org: Optional<PonyOrg>;
        if (this.flags.targetusername) {
            org = await useOrg(this.flags.targetusername);
        } else {
            await project.runTaskIfDefined('preOrgCreate', {
                targetusername: this.flags.targetusername,
            });
        }
        try {
            if (!org) {
                this.ux.log('Creating scratch org');
                org = await sfdx.force.org
                    .create(this.options)
                    .then(({username}: any) => PonyOrg.createPonyOrg({aliasOrUsername: username}));
            }
        } catch (e) {
            throw e;
        } finally {
            await project.runTaskIfDefined('postOrgCreate', {
                org,
                success: Boolean(org)
            });
        }
        return org;
    }
}
