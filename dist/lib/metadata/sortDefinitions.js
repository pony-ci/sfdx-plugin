"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortDefinitions = exports.supportedMetadataToSort = exports.isInnerTextSortKey = exports.isSortedByInnerText = void 0;
const ts_types_1 = require("@salesforce/ts-types");
const innerTextSortKey = '__inner_text__';
exports.isSortedByInnerText = (it) => ts_types_1.isAnyJson(it) && ts_types_1.isJsonMap(it) && Object.keys(it).length === 1 && exports.isInnerTextSortKey(Object.values(it)[0]);
exports.isInnerTextSortKey = (it) => ts_types_1.isString(it) && it === innerTextSortKey;
exports.supportedMetadataToSort = [
    'Profile'
];
exports.sortDefinitions = {
    Profile: [
        { applicationVisibilities: ['application'] },
        { classAccesses: ['apexClass'] },
        { externalDataSourceAccesses: ['externalDataSource'] },
        { fieldPermissions: ['field'] },
        { flowAccesses: ['flow'] },
        { layoutAssignments: ['layout', 'recordType'] },
        { objectPermissions: ['object'] },
        { pageAccesses: ['apexPage'] },
        { recordTypeVisibilities: ['recordType'] },
        { tabVisibilities: ['tab'] },
        { userPermissions: ['name'] },
        { userLicense: innerTextSortKey },
        { custom: innerTextSortKey },
        { customMetadataTypeAccesses: ['name'] },
    ]
};
//# sourceMappingURL=sortDefinitions.js.map