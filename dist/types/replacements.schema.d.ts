/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */
export declare type Files = string[];
export declare type ReplacementValue = string;
export declare type Search = string[];
export interface Replacements {
    [k: string]: Replacement;
}
export interface Replacement {
    innerText?: InnerTextReplacement;
    orgWideEmailAddress?: OrgWideEmailAddressReplacement;
}
export interface InnerTextReplacement {
    files: Files;
    replacement: ReplacementValue;
    search: Search;
}
export interface OrgWideEmailAddressReplacement {
    files: Files;
    replacement: ReplacementValue;
}