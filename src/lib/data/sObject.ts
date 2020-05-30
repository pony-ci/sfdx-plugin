import {DescribeSObjectResult} from 'jsforce/describe-result';
import {sfdx} from '../sfdx';

// username -> sobject -> describe
const describeSObjectResultCache = new Map<string, Map<string, DescribeSObjectResult>>();

export async function describeSObject(
    sObject: string, targetUsername: string, useCache: boolean = true
): Promise<DescribeSObjectResult> {
    const cache = describeSObjectResultCache.get(targetUsername) || new Map();
    describeSObjectResultCache.set(targetUsername, cache);
    if (!cache.has(sObject) || !useCache) {
        cache.set(sObject, await sfdx.force.schema.sobject.describe({
            quiet: true,
            sobjecttype: sObject,
            targetusername: targetUsername
        }));
    }
    return cache.get(sObject);
}
