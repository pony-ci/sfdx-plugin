import {AnyJson, Optional} from '@salesforce/ts-types/lib/types';
import Ajv from 'ajv';
import {Config, PackageGroup} from '..';

import configSchema from '../schema/config.schema.json';
import dataSchema from '../schema/data.schema.json';
import packageGroupSchema from '../schema/package-group.schema.json';
import sourceSortSchema from '../schema/source-sort.schema.json';
import sourceValidateSchema from '../schema/source-validate.schema.json';

const CONFIG_REF = 'config';
const DATA_REF = 'data';
const PACKAGE_GROUP_REF = 'packageGroup';
const SOURCE_SORT_REF = 'sourceSort';
const SOURCE_VALIDATE_REF = 'sourceValidate';

let ajv;

function validate(schemaKeyRef: string, value: Optional<AnyJson>): string | void {
    if (!ajv) {
        ajv = new Ajv({allErrors: true, extendRefs: 'fail'});
        ajv.addSchema(configSchema, CONFIG_REF);
        ajv.addSchema(dataSchema, DATA_REF);
        ajv.addSchema(packageGroupSchema, PACKAGE_GROUP_REF);
        ajv.addSchema(sourceSortSchema, SOURCE_SORT_REF);
        ajv.addSchema(sourceValidateSchema, SOURCE_VALIDATE_REF);
    }
    ajv.validate(schemaKeyRef, value);
    if (ajv.errors) {
        return `Invalid '${schemaKeyRef}': ${ajv.errorsText(ajv.errors)}`;
    }
}

export const validateConfig = (value: Optional<AnyJson>) => validate(CONFIG_REF, value);
export const validatePackageGroup = (value: Optional<AnyJson>) => validate(PACKAGE_GROUP_REF, value);

export const isConfig = (value: Optional<any>): value is Config =>
    validateConfig(value) === undefined;
export const isPackageGroup = (value: Optional<any>): value is PackageGroup =>
    validatePackageGroup(value) === undefined;
