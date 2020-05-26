import PonyCommand from '../../../lib/PonyCommand';

export default class OrgCreateCommand extends PonyCommand {

    public async run(): Promise<void> {
        this.setEnv('username', 'crs-qa');
        this.setEnv('arr', ['ele1', 'ele2', 'src/main/default/profiles/Crestyl Administrator.profile-meta.xml']);
    }
}
