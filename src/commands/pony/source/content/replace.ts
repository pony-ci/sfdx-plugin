import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import fs from 'fs-extra';
import path from 'path';
import {getAppHomeDir, Replacement} from '../../../..';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';
import {FilesBackup} from '../../../../lib/taskExecution';
import klaw from 'klaw-sync';

// sfdx pony:workflow:modify
// email alerts:
// <alerts>
//         <senderAddress>supportaw@aspectworks.com</senderAddress>
//         <senderType>OrgWideEmailAddress</senderType>
// </alerts>
// to
// <alerts>
//         <senderType>CurrentUser</senderType>
// </alerts>

export default class SourceContentReplaceCommand extends PonyCommand {

    public static description: string = `replace values in xml component files`;

    protected static flagsConfig: FlagsConfig = {
        replacement: flags.string({
            char: 'r',
            description: 'name of the replacement',
            required: true
        })
    };

    protected static requiresProject: boolean = true;

    public async run(): Promise<void> {
        const {replacement} = this.flags;
        const project = await PonyProject.load();
        const {replacements = {}} = await project.getPonyConfig();
        if (replacements[replacement]) {
            const backup = FilesBackup.create(project.projectDir);
            const files = await this.replace(replacements[replacement]);
            backup.backupFiles(files);
            // await backup.restoreBackupFiles();
            this.sendMessage({modifiedFiles: files});
        } else {
            throw Error(`Replacement not found: ${replacement}`);
        }
    }

    private async replace(rpl: Replacement): Promise<string[]> {
        const {files, search, replacement} = rpl;
        for (const file of files) {

            // await replaceInComponent(file, search, replacement);
        }
        return files;
    }
}
