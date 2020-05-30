import {flags} from '@salesforce/command';
import {FlagsConfig} from '@salesforce/command/lib/sfdxFlags';
import {
    InnerTextReplacement,
    isInnerTextReplacement,
    isOrgWideEmailAddressReplacement,
    OrgWideEmailAddressReplacement
} from '../../../..';
import {replaceInnerText} from '../../../../lib/filesManip';
import PonyCommand from '../../../../lib/PonyCommand';
import PonyProject from '../../../../lib/PonyProject';
import {FilesBackup} from '../../../../lib/taskExecution';

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
        const rpl = replacements[replacement];
        if (rpl) {
            if (isInnerTextReplacement(rpl) && rpl.innerText) {
                const backup = FilesBackup.create(project.projectDir);
                const files = await this.replaceInnerText(rpl.innerText);
                backup.backupFiles(files);
                // await backup.restoreBackupFiles();
                this.sendMessage({modifiedFiles: files});
            } else if (isOrgWideEmailAddressReplacement(rpl) && rpl.orgWideEmailAddress) {
                const backup = FilesBackup.create(project.projectDir);
                const files = await this.replaceOrgWideEmailAddress(rpl.orgWideEmailAddress);
                backup.backupFiles(files);
                // await backup.restoreBackupFiles();
                this.sendMessage({modifiedFiles: files});
            }
        } else {
            throw Error(`Replacement not found: ${replacement}`);
        }
    }

    private async replaceOrgWideEmailAddress(rpl: OrgWideEmailAddressReplacement): Promise<string[]> {
        return [];
    }

    private async replaceInnerText(rpl: InnerTextReplacement): Promise<string[]> {
        const {files, search, replacement} = rpl;
        for (const file of files) {
            await replaceInnerText(file, search, replacement);
        }
        return files;
    }
}
