/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type Step =
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
    };

export interface Jobs {
  [k: string]: Job;
}
export interface Job {
  steps?: Step[];
}