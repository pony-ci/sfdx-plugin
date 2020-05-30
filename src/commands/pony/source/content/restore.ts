import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import PonyCommand from '../../../../lib/PonyCommand';

export default class SourceContentRestoreCommand extends PonyCommand {

    public static description: string = `restore modified component files`;

    protected static flagsConfig: FlagsConfig = {};

    protected static requiresUsername: boolean = true;
    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
    }
}
