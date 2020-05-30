import {Command} from '@oclif/config';
import {flags, FlagsConfig} from '@salesforce/command';
import {Environment, executeJobByName} from '../../lib/jobs';
import PonyCommand from '../../lib/PonyCommand';
import PonyProject from '../../lib/PonyProject';
import Arg = Command.Arg;

export default class RunCommand extends PonyCommand {
    public static readonly description: string = `run job`;

    public static readonly supportsUsername: boolean = false;
    public static readonly supportsDevhubUsername: boolean = false;
    public static readonly requiresProject: boolean = false;

    public static readonly flagsConfig: FlagsConfig = {
        onlyifdefined: flags.boolean({
            description: 'execute the job only if defined',
            default: false
        })
    };

    public static readonly args: Arg[] = [
        {name: 'job', required: true}
    ];

    public async run(): Promise<void> {
        // const dag = new Graph<string>();
        // const a = new Node('A');
        // const b = new Node('B');
        // const c = new Node('C');
        // const d = new Node('D');
        // const e = new Node('E');
        // const f = new Node('F');
        //
        // const af = dag.addEdge(a, f);
        // const ba = dag.addEdge(b, a);
        // const dc = dag.addEdge(d, c);
        // const ef = dag.addEdge(e, f);
        // const db = dag.addEdge(d, b);
        // const ec = dag.addEdge(e, c);
        //
        // const cycle = dag.addEdge(f, d);
        //
        // console.log([...dag.nodes].map(it => it.value).join(' -> '));
        // // const order = getTopologicalOrder(dag);
        // const {order, edges} = getTopologicalOrderFromNonDAG(dag, new Set<Edge<string>>([
        //     ba, ef, dc
        // ]));
        // console.log(edges.map(it => `${it.from.value} -> ${it.to.value}`).join(`,\n`));
        // console.log(order.map(it => it.value).join(' -> '));
        const {onlyifdefined} = this.flags;
        const {job} = this.args;
        const project = await PonyProject.load();
        const config = await project.getPonyConfig();
        const jobs = config.jobs || {};
        if (jobs[job]) {
            await executeJobByName(jobs, job, Environment.create());
        } else if (!onlyifdefined) {
            throw Error(`Job not found: ${job}`);
        }
    }
}
