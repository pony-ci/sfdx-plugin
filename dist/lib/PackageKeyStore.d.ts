import { Optional } from '@salesforce/ts-types';
import { Package } from '..';
export declare class PackageKeyStore {
    private entries;
    private constructor();
    static loadPackageKeyStore(): PackageKeyStore;
    private static create;
    getInstallationKey(pkg: Package): Optional<string>;
}
