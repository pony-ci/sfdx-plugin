/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type SObjectNames = string[];

export interface DataConfig {
  sObjects?: {
    recordsDir?: string;
    import?: {
      chunkSize?: number;
      deleteBeforeImport?: (false | "reversedOrder") | SObjectNames;
      soqlDeleteDir?: string;
      order: SObjectNames;
      relationships?: Relationship[];
    };
    export?: {
      soqlExportDir?: string;
      order?: SObjectNames | "reversedOrder";
    };
  };
}
export interface Relationship {
  sObject: string;
  fieldMappings: FieldMapping[];
}
export interface FieldMapping {
  relationshipName: string;
  fieldName: string;
}
