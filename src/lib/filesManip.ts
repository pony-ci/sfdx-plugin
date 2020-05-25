import {isArray, isPlainObject, isString} from '@salesforce/ts-types';
import path from 'path';
import {readComponent, writeComponent} from './metadata/components';
import {getUX} from './ux';

export async function replaceInComponent(file: string, targets: string[], replacement: string): Promise<void> {
    const cmp = await readComponent(file);
    await replaceInComponentHelper(path.basename(file), cmp, targets, replacement);
    await writeComponent(file, cmp);
}

async function replaceInComponentHelper(cmpName: string, component: any, targets: string[], replacement: string)
    : Promise<void> {
    if (!component) {
        return;
    }
    const ux = await getUX();
    const logReplacement = (it, to) => ux.log(`replacing`, JSON.stringify(it), 'to', JSON.stringify(to), ` in ${cmpName}`);
    if (isArray(component)) {
        if (component.length === 1 && isString(component[0]) && targets.includes(component[0])) {
            logReplacement(component[0], replacement);
            component.splice(0, 1, replacement);
        } else {
            component.forEach(it => replaceInComponentHelper(cmpName, it, targets, replacement));
        }
    } else if (isPlainObject(component)) {
        for (const key of Object.keys(component)) {
            const value = component[key];
            if (isString(value) && targets.includes(value)) {
                logReplacement(value, replacement);
                component[key] = replacement;
            } else {
                replaceInComponentHelper(cmpName, value, targets, replacement);
            }
        }
    }
}