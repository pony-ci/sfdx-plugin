import {isAnyJson, isJsonMap, JsonMap} from '@salesforce/ts-types';
import {Optional} from '@salesforce/ts-types/lib/types';
import find from 'find';
import fs from 'fs-extra';
import {EOL} from 'os';
import xml2js, {OptionsV2} from 'xml2js';
import {getDescribe} from '../..';
import {describeMetadata, MetadataType} from './describeMetadata';

const DEFAULT_BUILDER_OPTIONS: OptionsV2 = {
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: undefined
    },
    renderOpts: {
        pretty: true,
        indent: '    ',
        newline: EOL
    }
};

export type Component = JsonMap;

export const isComponent = (value: Optional<unknown>): value is Component =>
    isAnyJson(value) && isJsonMap(value) && Object.keys(value).length === 1 && isJsonMap(value[Object.keys(value)[0]]);

export async function readComponent(file: string): Promise<Component> {
    const parser: xml2js.Parser = new xml2js.Parser({});
    const component = await parser.parseStringPromise(fs.readFileSync(file).toString());
    if (!isComponent(component)) {
        throw Error(`Invalid component: ${file}`);
    }
    return component;
}

export async function writeComponent(
    file: string,
    component: Component,
    options?: OptionsV2
): Promise<void> {
    if (!isComponent(component)) {
        throw Error(`Invalid component: ${JSON.stringify(component, null, 4)}`);
    }
    const root = component[Object.keys(component)[0]];
    if (isJsonMap(root) && !('$' in root)) {
        root.$ = {
            // tslint:disable-next-line:no-http-string
            xmlns: 'http://soap.sforce.com/2006/04/metadata'
        };
    }
    const builder: xml2js.Builder = new xml2js.Builder(options || DEFAULT_BUILDER_OPTIONS);
    await fs.writeFile(file, `${builder.buildObject(component)}${EOL}`);
}

export function findComponents(metadataType: MetadataType, dir: string = '.'): string[] {
    const pattern = metadataTypeToFilePattern(metadataType);
    if (!pattern) {
        throw Error(`${metadataType} is not described. Possibly not supported.`);
    }
    return find.fileSync(pattern, dir);
}

export function describeComponentFile(file: string): Optional<MetadataType> {
    const found = getDescribe().find(it => {
        const pattern = metadataTypeToFilePattern(it.xmlName);
        return pattern && pattern.test(file);
    });
    return found && found.xmlName;
}

const metadataTypeToFilePatternCache: {[key: string]: RegExp} = {};

function metadataTypeToFilePattern(metadataType: MetadataType): Optional<RegExp> {
    if (!metadataTypeToFilePatternCache[metadataType]) {
        const metadataObject = describeMetadata(metadataType);
        if (!metadataObject) {
            return undefined;
        }
        const directoryName: string = metadataObject.directoryName;
        const suffix: string = metadataObject.suffix ? `\.${metadataObject.suffix}(-meta\.xml)?` : '';
        metadataTypeToFilePatternCache[metadataType] = new RegExp(`.*?[/\\\\\]${directoryName}[/\\\\\].*?${suffix}`);
    }
    return metadataTypeToFilePatternCache[metadataType];
}

// export function findCustomObjectChildComponents(childXmlName: string, dir: string = '.'): string[] {
//     return find.fileSync(new RegExp(`.*?[/\\\\\]objects[/\\\\\].*?[/\\\\\]?\.${childXmlName}-meta\.xml`), dir);
// }
