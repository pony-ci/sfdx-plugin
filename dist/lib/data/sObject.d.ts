import { UX } from '@salesforce/command';
import { Optional } from '@salesforce/ts-types';
import { DescribeSObjectResult } from 'jsforce/describe-result';
interface DescribeSObjectOptions {
    useCache?: boolean;
    ux?: Optional<UX>;
}
export declare function describeSObject(sObject: string, targetUsername: string, options?: DescribeSObjectOptions): Promise<DescribeSObjectResult>;
export {};
