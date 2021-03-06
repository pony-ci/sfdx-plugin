/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Config {
  data?: DataConfig;
  jobs?: Jobs;
  orgCreate?: OrgCreateConfig;
  replacements?: Replacements;
  /**
   * Define which files and/or metadata types to sort on 'pony:source:sort' command.
   */
  sourceSort?: ("all" | "source" | "none") | [string];
  sourceValidate?: SourceValidate;
  users?: {
    [k: string]: User;
  };
}
export interface DataConfig {
  sObjects?: {
    recordsDir?: string;
    import?: {
      chunkSize?: number;
      deleteBeforeImport?: (false | "reversedOrder") | string[];
      soqlDeleteDir?: string;
      order: string[];
      relationships?: {
        [k: string]: string[];
      };
    };
    export?: {
      soqlExportDir?: string;
      order?: string[] | "reversedOrder";
    };
  };
}
export interface Jobs {
  [k: string]: {
    steps?: (
      | {
          echo: string;
        }
      | {
          env: string;
        }
      | {
          job: string;
        }
      | {
          run: string;
        }
      | {
          sfdx: string;
        }
    )[];
  };
}
export interface OrgCreateConfig {
  generateUsername?: boolean;
  /**
   * do not include second-generation package ancestors in the scratch org
   */
  noAncestors?: boolean;
  /**
   * create the scratch org with no namespace
   */
  noNamespace?: boolean;
  /**
   * duration of the scratch org (in days)
   */
  durationDays?: number;
  /**
   * path to an org definition file
   */
  definitionFile?: string;
}
export interface Replacements {
  [k: string]: {
    innerText?: InnerTextReplacement;
    orgWideEmailAddress?: OrgWideEmailAddressReplacement;
  };
}
export interface InnerTextReplacement {
  files: string[];
  replacement: string;
  search: string[];
}
export interface OrgWideEmailAddressReplacement {
  files: string[];
  replacement: string;
}
export interface SourceValidate {
  deleteOrg?: boolean | ("always" | "never" | "onSuccess");
  trackedFieldHistory?: boolean | ["error" | "warning" | "info", number, ...string[]];
}
export interface User {
  [k: string]: string | boolean;
}
