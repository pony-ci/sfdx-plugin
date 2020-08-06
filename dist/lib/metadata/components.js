"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeComponentFile = exports.findComponents = exports.writeComponent = exports.readComponent = exports.isComponent = void 0;
const ts_types_1 = require("@salesforce/ts-types");
const find_1 = __importDefault(require("find"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = require("os");
const xml2js_1 = __importDefault(require("xml2js"));
const __1 = require("../..");
const describeMetadata_1 = require("./describeMetadata");
const DEFAULT_BUILDER_OPTIONS = {
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: undefined
    },
    renderOpts: {
        pretty: true,
        indent: '    ',
        newline: os_1.EOL
    }
};
exports.isComponent = (value) => ts_types_1.isJsonMap(value) && Object.keys(value).length === 1 && ts_types_1.isJsonMap(value[Object.keys(value)[0]]);
async function readComponent(file) {
    const parser = new xml2js_1.default.Parser({});
    const component = await parser.parseStringPromise(fs_extra_1.default.readFileSync(file).toString());
    if (!exports.isComponent(component)) {
        throw Error(`Invalid component: ${file}`);
    }
    return component;
}
exports.readComponent = readComponent;
async function writeComponent(file, component, options) {
    if (!exports.isComponent(component)) {
        throw Error(`Invalid component: ${JSON.stringify(component, null, 4)}`);
    }
    const root = component[Object.keys(component)[0]];
    if (ts_types_1.isJsonMap(root) && !('$' in root)) {
        root.$ = {
            // tslint:disable-next-line:no-http-string
            xmlns: 'http://soap.sforce.com/2006/04/metadata'
        };
    }
    const builder = new xml2js_1.default.Builder(options || DEFAULT_BUILDER_OPTIONS);
    await fs_extra_1.default.writeFile(file, `${builder.buildObject(component)}${os_1.EOL}`);
}
exports.writeComponent = writeComponent;
function findComponents(type, dir = '.') {
    const pattern = metadataTypeToFilePattern(type);
    if (!pattern) {
        throw Error(`${type} is not described. Possibly not supported.`);
    }
    return find_1.default.fileSync(pattern, dir);
}
exports.findComponents = findComponents;
function describeComponentFile(file) {
    const found = __1.getDescribe().find(it => {
        const pattern = metadataTypeToFilePattern(it.xmlName);
        return pattern && pattern.test(file);
    });
    return found && found.xmlName;
}
exports.describeComponentFile = describeComponentFile;
const metadataTypeToFilePatternCache = {};
function metadataTypeToFilePattern(type) {
    if (!metadataTypeToFilePatternCache[type]) {
        const metadataObject = describeMetadata_1.describeMetadata(type);
        if (!metadataObject) {
            return undefined;
        }
        const directoryName = metadataObject.directoryName;
        const suffix = metadataObject.suffix ? `\.${metadataObject.suffix}(-meta\.xml)?` : '';
        metadataTypeToFilePatternCache[type] = new RegExp(`.*?[/\\\\\]${directoryName}[/\\\\\].*?${suffix}`);
    }
    return metadataTypeToFilePatternCache[type];
}
// export function findCustomObjectChildComponents(childXmlName: string, dir: string = '.'): string[] {
//     return find.fileSync(new RegExp(`.*?[/\\\\\]objects[/\\\\\].*?[/\\\\\]?\.${childXmlName}-meta\.xml`), dir);
// }
//# sourceMappingURL=components.js.map