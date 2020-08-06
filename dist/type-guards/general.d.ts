export declare const hasProp: <O extends object, K extends string | number | symbol>(obj: O, propKey: K) => obj is O & { [key in K]: unknown; };
