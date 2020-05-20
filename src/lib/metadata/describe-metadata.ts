import fs from 'fs-extra';
import path from 'path';

export type MetadataType = string;

export interface MetadataDescribe {
    directoryName: string;
    inFolder: boolean;
    metaFile: boolean;
    suffix?: string;
    xmlName: string;
    childXmlNames?: string | string[];
}

export function describeMetadata(metadataType: MetadataType): MetadataDescribe | undefined {
    return getDescribe().find((it: MetadataDescribe) => it.xmlName === metadataType);
}

let described: MetadataDescribe[] | undefined;

function getDescribe(): MetadataDescribe[] {
    if (!described) {
        described = [
            ...fs.readJSONSync(path.join(
                __dirname, '../../metadata/describe.json'
            )).metadataObjects,
            ...fs.readJSONSync(path.join(
                __dirname, '../../metadata/source-describe.json'
            )).metadataObjects
        ];
    }
    return described;
}
