import {FlagsConfig} from '@salesforce/command';
import PonyCommand from '../lib/PonyCommand';

const DESCRIPTION = `Automate your application lifecycle.

* Repository: https://github.com/pony-ci/sfdx-plugin
`;

export default class SourcePushCommand extends PonyCommand {
    public static readonly description: string = ``;

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = false;

    public static readonly flagsConfig: FlagsConfig = {};

    public async run(): Promise<void> {
        this.ux.log(DESCRIPTION);
    }
}
