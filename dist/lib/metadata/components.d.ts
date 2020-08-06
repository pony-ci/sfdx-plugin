import { JsonMap } from '@salesforce/ts-types';
import { Optional } from '@salesforce/ts-types/lib/types';
import { OptionsV2 } from 'xml2js';
import { MetadataType } from './describeMetadata';
export declare type Component = JsonMap;
export declare const isComponent: (value: Optional<any>) => value is JsonMap;
export declare function readComponent(file: string): Promise<Component>;
export declare function writeComponent(file: string, component: Component, options?: OptionsV2): Promise<void>;
export declare function findComponents(type: MetadataType, dir?: string): string[];
export declare function describeComponentFile(file: string): Optional<MetadataType>;
