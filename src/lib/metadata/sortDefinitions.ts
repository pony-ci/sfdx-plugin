import {Dictionary, isAnyJson, isJsonMap, isString} from '@salesforce/ts-types';
import {MetadataType} from './describeMetadata';

const innerTextSortKey = '__inner_text__';

export const isSortedByInnerText = (it: unknown) =>
    isAnyJson(it) && isJsonMap(it) && Object.keys(it).length === 1 && isInnerTextSortKey(Object.values(it)[0]);

export const isInnerTextSortKey = (it: unknown) => isString(it) && it === innerTextSortKey;

// from most significant to least
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
        {layoutAssignments: ['layout', 'recordType']},
        {objectPermissions: ['object']},
        {pageAccesses: ['apexPage']},
        {recordTypeVisibilities: ['recordType']},
        {tabVisibilities: ['tab']},
        {userPermissions: ['name']},
        {userLicense: innerTextSortKey},
        {custom: innerTextSortKey},
        {customMetadataTypeAccesses: ['name']},
    ]
};