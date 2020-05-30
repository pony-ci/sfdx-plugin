/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type Files = string[];
export type ReplacementValue = string;
export type Search = string[];

export interface Replacements {
  [k: string]: Replacement;
}
export interface Replacement {
  innerText?: InnerText;
  orgWideEmailAddress?: OrgWideEmailAddress;
}
export interface InnerText {
  files: Files;
  replacement: ReplacementValue;
  search: Search;
}
export interface OrgWideEmailAddress {
  files: Files;
  replacement: ReplacementValue;
}
