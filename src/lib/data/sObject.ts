import {UX} from '@salesforce/command';
import {Optional} from '@salesforce/ts-types';
import {DescribeSObjectResult} from 'jsforce/describe-result';
import {sfdx} from '../sfdx';

// username -> sobject -> describe
const describeSObjectResultCache = new Map<string, Map<string, DescribeSObjectResult>>();

interface DescribeSObjectOptions {
    useCache?: boolean;
    ux?: Optional<UX>;
}

export async function describeSObject(
    sObject: string, targetUsername: string, options: DescribeSObjectOptions = {}
): Promise<DescribeSObjectResult> {
    const {useCache = true, ux} = options;
    const cache = describeSObjectResultCache.get(targetUsername) || new Map();
    describeSObjectResultCache.set(targetUsername, cache);
    if (!cache.has(sObject) || !useCache) {
        if (ux) {
            ux.startSpinner(`Describing ${sObject} sObject`);
        }
        cache.set(sObject, await sfdx.force.schema.sobject.describe({
            quiet: true,
            sobjecttype: sObject,
            targetusername: targetUsername
        }));
        if (ux) {
            ux.stopSpinner();
        }
    }
    return cache.get(sObject);
}
