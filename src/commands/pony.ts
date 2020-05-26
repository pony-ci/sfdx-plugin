import {FlagsConfig} from '@salesforce/command';
import {getUX} from '..';
import PonyCommand from '../lib/PonyCommand';

const DESCRIPTION = `Automate your application lifecycle.

* Repository: https://github.com/pony-ci/sfdx-plugin
`;

export default class PonyBaseCommand extends PonyCommand {
    public static readonly description: string = ``;

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = false;

    public static readonly flagsConfig: FlagsConfig = {};

    public async run(): Promise<any> {
        const ux = await getUX();
        ux.log(DESCRIPTION);

        // const config = readFileSync('/home/ondrej/projects/pony-ci/sfdx-plugin/template.yml').toString();
        // const yml = yaml.parse(config);
        // console.log(validateConfig(yml));
        // const opts: any = {
        //     stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        // };
        // const ls = spawn('node',
        //     ['/home/ondrej/projects/pony-ci/sfdx-plugin/bin/run', 'pony:org:test'],
        //     opts);
        //
        // ls.on('message', (message) => {
        //     if (isJsonMap(message) && 'pony' in message) {
        //         console.log(`msg from child`, message);
        //     }
        // });
        //
        // ls.on('close', (code) => {
        //     console.log(`child process exited with code ${code}`);
        // });
        return {ahoj: DESCRIPTION};
    }
}
