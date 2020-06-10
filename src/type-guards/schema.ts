import {isAnyJson, isJsonMap} from '@salesforce/ts-types';
import {AnyJson, Optional} from '@salesforce/ts-types/lib/types';
import Ajv from 'ajv';
import {Config, DataConfig, InnerTextReplacement, OrgWideEmailAddressReplacement, PackageGroups} from '..';

import configSchema from '../schema/config.schema.json';
import dataSchema from '../schema/data-config.schema.json';
import jobsSchema from '../schema/jobs.schema.json';
import orgCreateSchema from '../schema/org-create.schema.json';
import packageGroupsSchema from '../schema/package-groups.schema.json';
import replacementsSchema from '../schema/replacements.schema.json';
import sourceSortSchema from '../schema/source-sort.schema.json';
import sourceValidateSchema from '../schema/source-validate.schema.json';

const CONFIG_REF = 'config';
const DATA_REF = 'data';
const JOBS_REF = 'jobs';
const ORG_CREATE_REF = 'orgCreate';
const PACKAGE_GROUPS_REF = 'packageGroups';
const REPLACEMENTS_REF = 'replacements';
const SOURCE_SORT_REF = 'sourceSort';
const SOURCE_VALIDATE_REF = 'sourceValidate';

let ajv;

function validate(schemaKeyRef: string, value: Optional<AnyJson>): string | void {
    if (!ajv) {
        ajv = new Ajv({allErrors: true, extendRefs: 'fail'});
        ajv.addSchema(configSchema, CONFIG_REF);
        ajv.addSchema(dataSchema, DATA_REF);
        ajv.addSchema(jobsSchema, JOBS_REF);
        ajv.addSchema(orgCreateSchema, ORG_CREATE_REF);
        ajv.addSchema(packageGroupsSchema, PACKAGE_GROUPS_REF);
        ajv.addSchema(replacementsSchema, REPLACEMENTS_REF);
        ajv.addSchema(sourceSortSchema, SOURCE_SORT_REF);
        ajv.addSchema(sourceValidateSchema, SOURCE_VALIDATE_REF);
    }
    ajv.validate(schemaKeyRef, value);
    if (ajv.errors) {
        return `Invalid '${schemaKeyRef}': ${ajv.errorsText(ajv.errors)}`;
    }
}

export const validateConfig = (value: Optional<AnyJson>) => validate(CONFIG_REF, value);
export const validateDataConfig = (value: Optional<AnyJson>) => validate(DATA_REF, value);
export const validateJobs = (value: Optional<AnyJson>) => validate(JOBS_REF, value);
export const validatePackageGroups = (value: Optional<AnyJson>) => validate(PACKAGE_GROUPS_REF, value);

export const isConfig = (value: unknown): value is Config =>
    isAnyJson(value) && validateConfig(value) === undefined;
export const isPackageGroups = (value: unknown): value is PackageGroups =>
    isAnyJson(value) && validatePackageGroups(value) === undefined;
export const isDataConfig = (value: unknown): value is DataConfig =>
    isAnyJson(value) && validateDataConfig(value) === undefined;
export const isInnerTextReplacement = (value: unknown): value is InnerTextReplacement =>
    isAnyJson(value) && isJsonMap(value) && 'innerText' in value;
export const isOrgWideEmailAddressReplacement = (value: unknown): value is OrgWideEmailAddressReplacement =>
    isAnyJson(value) && isJsonMap(value) && 'orgWideEmailAddress' in value;