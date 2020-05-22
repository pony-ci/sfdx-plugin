import {Dictionary, isJsonMap} from '@salesforce/ts-types';
import {MetadataType} from './describeMetadata';

export const INNER_TEXT_SORT_KEY = '__inner_text__';

export const isSortedByInnerText = (it: any) =>
    isJsonMap(it) && Object.keys(it).length === 1 && Object.values(it)[0] === INNER_TEXT_SORT_KEY;

export type SortDefinition = Dictionary<'__inner_text__' | string[]>[];

export const supportedMetadataToSort: MetadataType[] = [
    'Profile'
];

export const sortDefinitions: Dictionary<SortDefinition> = {
    Profile: [
        {applicationVisibilities: ['application']},
        {classAccesses: ['apexClass']},
        {externalDataSourceAccesses: ['externalDataSource']},
        {fieldPermissions: ['field']},
        {flowAccesses: ['flow']},
        {layoutAssignments: ['recordType', 'layout']},
        {objectPermissions: ['object']},
        {pageAccesses: ['apexPage']},
        {recordTypeVisibilities: ['recordType']},
        {tabVisibilities: ['tab']},
        {userPermissions: ['name']},
        {userLicense: INNER_TEXT_SORT_KEY},
        {custom: INNER_TEXT_SORT_KEY},
        {customMetadataTypeAccesses: ['name']},
    ]
};