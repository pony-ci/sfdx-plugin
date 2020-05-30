import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../lib/PonyCommand';
import PonyProject from '../../../lib/PonyProject';

export default class DataImportCommand extends PonyCommand {

    public static description: string = ``;

    protected static flagsConfig: FlagsConfig = {};

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const project = await PonyProject.load();
        const data = await project.getDataConfig();

    }
}
