"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeSObject = void 0;
const sfdx_1 = require("../sfdx");
// username -> sobject -> describe
const describeSObjectResultCache = new Map();
async function describeSObject(sObject, targetUsername, options = {}) {
    const { useCache = true, ux } = options;
    const cache = describeSObjectResultCache.get(targetUsername) || new Map();
    describeSObjectResultCache.set(targetUsername, cache);
    if (!cache.has(sObject) || !useCache) {
        if (ux) {
            ux.startSpinner(`Describing ${sObject} sObject`);
        }
        cache.set(sObject, await sfdx_1.sfdx.force.schema.sobject.describe({
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
exports.describeSObject = describeSObject;
//# sourceMappingURL=sObject.js.map