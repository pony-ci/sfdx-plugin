import {FlagsConfig} from '@salesforce/command';
import {getUX} from '..';
import PonyCommand from '../lib/PonyCommand';

const DESCRIPTION = `Automate your application lifecycle.

* Docs: https://pony-ci.github.io/pony-ci
* Plugin Repository: https://github.com/pony-ci/sfdx-plugin
* Plugin Issues: https://github.com/pony-ci/sfdx-plugin/issues
`;

export default class PonyBaseCommand extends PonyCommand {

    // public static readonly description: string = DESCRIPTION;
    public static readonly theDescription: string = DESCRIPTION;
    public static readonly longDescription: string = DESCRIPTION;
    public static readonly help: string = DESCRIPTION;

    public static readonly : string = DESCRIPTION;

    public static readonly flagsConfig: FlagsConfig = {};

    public async run(): Promise<void> {
        const ux = await getUX();
        ux.log(DESCRIPTION);
    }
}
