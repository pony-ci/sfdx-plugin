import {isArray, isPlainObject, isString, JsonMap} from '@salesforce/ts-types';
import {readComponent, writeComponent} from './metadata/components';
import {getUX} from './pubsub';

export async function replaceInComponent(file: string, targets: string[], replacement: string): Promise<void> {
    const cmp = await readComponent(file);
    await replaceInComponentHelper(cmp, targets, replacement);
    await writeComponent(file, cmp);
}

async function replaceInComponentHelper(component: JsonMap, targets: string[], replacement: string): Promise<void> {
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
            component.forEach(it => replaceInComponentHelper(it as JsonMap, targets, replacement));
        }
    } else if (isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (isString(value) && targets.includes(value)) {
                logReplacement(value, replacement);
                component[key] = replacement;
            } else {
                await replaceInComponentHelper(value as JsonMap, targets, replacement);
            }
        }
    }
}