export declare const sfdx: any;
export { Flags, Opts } from '@pony-ci/sfdx-node';
export interface RunApexTestsOptions {
    targetusername?: string;
    synchronous?: boolean;
}
export interface AuthJwtGrantOptions {
    jwtkeyfile?: string;
    clientid?: string;
    username?: string;
    instanceurl?: string;
}
/**
 * Options for package installation.
 */
export interface ListOrgsOptions {
    all?: boolean;
    clean?: boolean;
    verbose?: boolean;
}
export declare function logoutAll(): Promise<void>;
export declare function listOrgs(options?: ListOrgsOptions): Promise<unknown>;
