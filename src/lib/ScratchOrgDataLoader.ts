
// pony:data:import:soql:query:create
// pony:data:export:soql:query:create
// pony:data:import --allowsandbox (or -y prompt)
// pony:data:export
// data/soql/import/Account.soql

import {Optional} from '@salesforce/ts-types';

interface SObject {
    attributes: {
        type: string;
        referenceId: string;
    };

    // tslint:disable-next-line:no-any
    [key: string]: any;
}

interface Mapping {
    sObjectName: string;
    fieldMappings: FieldMapping[];
}

interface FieldMapping {
    sourceFieldName: string;
    targetFieldName: string;
}

function loadJson(sObjectName: string): { records: SObject[] } {
    return {records: []};
}

function loadMappings(): Mapping[] {
    return [];
}

class ScratchOrgDataLoader {

    private sObjectsToInsert: SObject[] = [];
    private sObjects: SObject[];
    private readonly sObjectName: string;
    private recordTypeDeveloperNameToId: Map<string, string> = new Map<string, string>();

    constructor(sObjectName: string) {
        this.sObjectName = sObjectName;
        this.sObjects = loadJson(sObjectName).records;
    }

    public insert(chunkIndex: number, chunkSize: number): void {
        const mappings = loadMappings();
        const chunkStart = (chunkIndex - 1) * chunkSize;
        const chunkEnd = chunkStart + chunkSize;
        this.sObjectsToInsert = this.sObjects.slice(chunkStart, chunkEnd);
        const realEnd = chunkStart + this.sObjectsToInsert.length;
        console.log(`inserting: ${chunkStart}-${realEnd} of ${this.sObjects.length} ${this.sObjectName}`);
        for (const objectMapping of mappings) {
            if (this.sObjectName === objectMapping?.sObjectName) {
                for (const fieldMapping of (objectMapping.fieldMappings || [])) {
                    this.mapField(fieldMapping.sourceFieldName, fieldMapping.targetFieldName);
                }
            }
        }
        insert(this.sObjectsToInsert);
    }

    public mapField(sourceFieldName: string, targetFieldName: string): void {
        const sourceFieldValuesSet: Set<Optional<string>> = new Set<Optional<string>>(this.sObjectsToInsert
            .map(sobj => this.getSourceFieldValue(sobj, sourceFieldName)));
        const sourceObjectName = this.getSourceObjectApiName(sourceFieldName);
        if (!sourceObjectName) {
            return;
        }
        const sourceFieldCroppedName = sourceFieldName.split('.').pop();
        // let sourceValueToTargetValueMap = new Map<string, string>();
        // if (sourceObjectName === 'RecordType') {
        //     if (sourceFieldCroppedName !== 'DeveloperName') {
        //         throw Error('Record Type can be mapped only by DeveloperName');
        //     }
        //     for (const sourceFieldValue of sourceFieldValuesSet) {
        //         if (sourceFieldValue && this.recordTypeDeveloperNameToId[sourceFieldValue]) {
        //             sourceValueToTargetValueMap.set(sourceFieldValue,
        //                 this.recordTypeDeveloperNameToId[sourceFieldValue]);
        //         }
        //     }
        // } else {
        //     sourceValueToTargetValueMap = prepareSourceValueToTargetValueMap(
        //         sourceObjectName, sourceFieldCroppedName, sourceFieldValuesSet);
        // }
        // for (const sobj of this.sObjectsToInsert) {
        //     const sourceFieldValue = this.getSourceFieldValue(sobj, sourceFieldName);
        //     const targetFieldValue = sourceValueToTargetValueMap.get(sourceFieldValue);
        //     if (sourceFieldValue && targetFieldName) {
        //         sobj[sourceFieldName.substr(0, sourceFieldName.indexOf('.'))] = undefined;
        //         sobj[targetFieldName] = targetFieldValue;
        //     }
        // }
    }

    public getSourceFieldValue(sobj: SObject, sourceFieldName: string): string | undefined {
        let currentSObject = sobj;
        const fieldPath = sourceFieldName.split('.');
        fieldPath.forEach((currentFieldName, i) => {
            if (i === fieldPath.length - 1) {
                return currentSObject[currentFieldName];
            }
            currentSObject = <SObject> currentSObject[currentFieldName];
            if (!currentSObject) {
                return undefined;
            }
        });
        throw Error('Bad configuration: getSourceFieldValue');
    }

    public getSourceObjectApiName(sourceFieldName: string): string | undefined {
        for (const sobj of this.sObjectsToInsert) {
            let currentSObject = sobj;
            const fieldPath = sourceFieldName.split('.');
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < fieldPath.length; i++) {
                currentSObject = sobj[fieldPath[i]];
                if (!currentSObject) {
                    break;
                }
                if (i === fieldPath.length - 2) {
                    return currentSObject?.attributes?.type;
                }
            }
        }
        return undefined;
    }
}

function prepareSourceValueToTargetValueMap(
    sourceObjectName: string, sourceFieldName: string, sourceValues: Set<string>
): Map<string, string> {
    const result = new Map<string, string>();
    const q = `SELECT Id, ${sourceFieldName} FROM ${sourceObjectName} WHERE ${sourceFieldName} IN ( ${[...sourceValues].join(' ')} )`;
    for (const sobj of query(q)) {
        result.set(sobj[sourceFieldName], sobj.Id);
    }
    return result;
}

function insert(records: SObject[]): void {

}

function query(q: string): SObject[] {
    return [];
}
