import { Dictionary, Optional } from '@salesforce/ts-types';
import { Jobs } from '..';
import { Step } from '../types/jobs.schema';
export interface IPCMessage {
    pony: {
        env: {
            variables: Variables;
        };
    };
}
declare type Variables = Dictionary<EnvValue>;
declare type HrTime = [number, number];
export declare const isIPCMessage: (value: unknown) => value is IPCMessage;
export declare type EnvValue = Optional<string>;
export declare class Environment {
    readonly hrtime: [number, number];
    private readonly variables;
    private constructor();
    static create(variables: Variables, hrtime: HrTime): Environment;
    static parse(json: string): Environment;
    static default(): Environment;
    static stringify(env: Environment): string;
    getEnv(name: string): Optional<EnvValue>;
    setEnv(name: string, value: Optional<EnvValue>): void;
    clone(): Environment;
    fillString(str: string): string;
    private sendMessage;
}
export declare function executeJobByName(jobs: Jobs, name: string, env: Environment): Promise<Environment>;
export declare function executeStep(jobs: Jobs, step: Step, environment: Environment): Promise<Environment>;
export {};
