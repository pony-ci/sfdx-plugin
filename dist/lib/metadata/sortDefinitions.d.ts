import { Dictionary } from '@salesforce/ts-types';
import { MetadataType } from './describeMetadata';
export declare const isSortedByInnerText: (it: unknown) => boolean;
export declare const isInnerTextSortKey: (it: unknown) => boolean;
export declare type SortDefinition = Dictionary<'__inner_text__' | string[]>[];
export declare const supportedMetadataToSort: MetadataType[];
export declare const sortDefinitions: Dictionary<SortDefinition>;
