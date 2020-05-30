import {
    AnyJson,
    isAnyJson,
    isArray,
    isJsonArray,
    isJsonMap,
    isPlainObject,
    isString,
    JsonMap
} from '@salesforce/ts-types';
import {JsonCollection} from '@salesforce/ts-types/lib/types/json';
import {readComponent, writeComponent} from './metadata/components';
import {getUX} from './pubsub';

export async function replaceInnerText(file: string, targets: string[], replacement: string): Promise<void> {
    const cmp = await readComponent(file);
    await replaceInnerTextHelper(cmp, targets, replacement);
    await writeComponent(file, cmp);
}

async function replaceInnerTextHelper(component: JsonMap, targets: string[], replacement: string): Promise<void> {
    if (!component) {
        return;
    }
    const ux = await getUX();
    const logReplacement = (it, to) => ux.log(JSON.stringify(it), '->', JSON.stringify(to));
    if (isArray(component)) {
        if (component.length === 1 && isString(component[0]) && targets.includes(component[0])) {
            logReplacement(component[0], replacement);
            component.splice(0, 1, replacement);
        } else {
            component.forEach(it => replaceInnerTextHelper(it as JsonMap, targets, replacement));
        }
    } else if (isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (isString(value) && targets.includes(value)) {
                logReplacement(value, replacement);
                component[key] = replacement;
            } else {
                await replaceInnerTextHelper(value as JsonMap, targets, replacement);
            }
        }
    }
}

export async function replaceOrgWideEmailAddress(file: string, replacement: AnyJson): Promise<void> {
    const cmp = await readComponent(file);
    await replaceOrgWideEmailAddressHelper(cmp, replacement);
    await writeComponent(file, cmp);
}

async function replaceOrgWideEmailAddressHelper(component: JsonCollection, replacement: AnyJson): Promise<void> {
    if (!component) {
        return;
    }
    const ux = await getUX();
    if (isArray(component)) {
        component.forEach(it => {
            if (isAnyJson(it) && (isJsonMap(it) || isJsonArray(it))) {
                replaceOrgWideEmailAddressHelper(it, replacement);
            }
        });
    } else if (isPlainObject(component)) {
        if (isArray(component.senderType) && component.senderType.length && component.senderType[0] === 'OrgWideEmailAddress') {
            if (component.senderAddress) {
                delete component.senderAddress;
            }
            component.senderType = [replacement];
        } else {
            for (const value of Object.values(component)) {
                if (isAnyJson(value) && (isJsonMap(value) || isJsonArray(value))) {
                    await replaceOrgWideEmailAddressHelper(value, replacement);
                }
            }
        }
    }
}
