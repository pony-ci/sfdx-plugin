import { Optional } from '@salesforce/ts-types';
export declare type MetadataType = string;
export interface MetadataDescribe {
    directoryName: string;
    inFolder: boolean;
    metaFile: boolean;
    suffix?: string;
    xmlName: string;
    childXmlNames?: string | string[];
}
export declare function describeMetadata(metadataType: MetadataType): Optional<MetadataDescribe>;
export declare function getDescribe(): MetadataDescribe[];
