"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDescribe = exports.describeMetadata = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function describeMetadata(metadataType) {
    return getDescribe().find((it) => it.xmlName === metadataType);
}
exports.describeMetadata = describeMetadata;
let described;
function getDescribe() {
    if (!described) {
        described = [
            ...fs_extra_1.default.readJSONSync(path_1.default.join(__dirname, '../../../metadata/describe.json')).metadataObjects,
            ...fs_extra_1.default.readJSONSync(path_1.default.join(__dirname, '../../../metadata/source-describe.json')).metadataObjects
        ];
    }
    return described;
}
exports.getDescribe = getDescribe;
//# sourceMappingURL=describeMetadata.js.map