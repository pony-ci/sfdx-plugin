import {UX} from '@salesforce/command';

let registeredUX: any;

export async function getUX(): Promise<UX> {
    if (!registeredUX) {
        return UX.create();
    }
    return registeredUX;
}

export function registerUX(ux: any): void {
    registeredUX = ux;
}
