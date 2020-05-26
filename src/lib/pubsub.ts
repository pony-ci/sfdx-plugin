import {UX} from '@salesforce/command';
import {Logger} from '@salesforce/core';
import {Optional} from '@salesforce/ts-types';

let registeredUX: Optional<UX>;
let registeredLogger: Optional<Logger>;

export async function getUX(): Promise<UX> {
    if (!registeredUX) {
        throw Error('No UX registered.');
    }
    return registeredUX;
}

export function registerUX(ux: UX): void {
    registeredUX = ux;
}

export async function getLogger(): Promise<Logger> {
    if (!registeredLogger) {
        throw Error('No logger registered.');
    }
    return registeredLogger;
}

export function registerLogger(logger: Logger): void {
    registeredLogger = logger;
}
