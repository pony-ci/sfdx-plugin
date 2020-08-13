import {isAnyJson, isJsonMap} from '@salesforce/ts-types';
import {Config, DataConfig, InnerTextReplacement, OrgWideEmailAddressReplacement, PackageGroups} from '..';
import {validateConfig, validateDataConfig, validatePackageGroups} from '../lib/schema';

export const isConfig = (value: unknown): value is Config =>
    isAnyJson(value) && validateConfig(value) === undefined;
export const isPackageGroups = (value: unknown): value is PackageGroups =>
    isAnyJson(value) && validatePackageGroups(value) === undefined;
export const isDataConfig = (value: unknown): value is DataConfig =>
    isAnyJson(value) && validateDataConfig(value) === undefined;
export const isInnerTextReplacement = (value: unknown): value is InnerTextReplacement =>
    isAnyJson(value) && isJsonMap(value) && 'files' in value && 'replacement' in value && 'search' in value;
export const isOrgWideEmailAddressReplacement = (value: unknown): value is OrgWideEmailAddressReplacement =>
    isAnyJson(value) && isJsonMap(value) && 'files' in value && 'replacement' in value && !('search' in value);
