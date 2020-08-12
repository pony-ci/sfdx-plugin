import {Optional} from '@salesforce/ts-types';
import fs from 'fs-extra';
import path from 'path';
import {Package} from '..';
import {getAppHomeDir} from './app';

interface KeyEntry {
    name: string;
    entryType: 'subscriberPackageVersionId' | 'subscriberPackageName' | 'subscriberPackageNamespace';
    key: string;
}

export class PackageKeyStore {

    private entries: KeyEntry[];

    private constructor(entries: KeyEntry[]) {
        this.entries = entries;
    }

    public static loadPackageKeyStore(): PackageKeyStore {
        const file = path.join(getAppHomeDir(), 'packages/store.json');
        if (!fs.existsSync(file)) {
            const store = PackageKeyStore.create();
            fs.writeJSONSync(file, store);
            return store;
        }
        return fs.readJSONSync(file);
    }

    private static create(entries: KeyEntry[] = []): PackageKeyStore {
        return new PackageKeyStore(entries);
    }

    public getInstallationKey(pkg: Package): Optional<string> {
        let entry = this.entries.find(it =>
            it.entryType === 'subscriberPackageVersionId'
            && it.name === pkg.SubscriberPackageId
        );
        if (!entry) {
            entry = this.entries.find(it =>
                it.entryType === 'subscriberPackageName'
                && it.name === pkg.SubscriberPackageName
            );
        }
        if (!entry) {
            entry = this.entries.find(it =>
                it.entryType === 'subscriberPackageNamespace'
                && it.name === pkg.SubscriberPackageNamespace
            );
        }
        return entry?.key;
    }
}
