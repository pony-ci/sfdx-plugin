
// use hasProp instead of 'in' operator to cast
export const hasProp =
    <O extends object, K extends PropertyKey>(obj: O, propKey: K): obj is O & { [key in K]: unknown } =>
    propKey in obj;