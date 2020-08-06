"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasProp = void 0;
// use hasProp instead of 'in' operator to cast
exports.hasProp = (obj, propKey) => propKey in obj;
//# sourceMappingURL=general.js.map