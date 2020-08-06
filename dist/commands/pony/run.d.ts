import { Command } from '@oclif/config';
import { FlagsConfig } from '@salesforce/command';
import PonyCommand from '../../lib/PonyCommand';
import Arg = Command.Arg;
export default class RunCommand extends PonyCommand {
    static readonly description: string;
    static readonly supportsUsername: boolean;
    static readonly supportsDevhubUsername: boolean;
    static readonly requiresProject: boolean;
    static readonly flagsConfig: FlagsConfig;
    static readonly args: Arg[];
    run(): Promise<void>;
}
