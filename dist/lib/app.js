"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppHomeDir = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
function getAppHomeDir() {
    const dir = path_1.default.join(os_1.homedir(), '.pony');
    fs_extra_1.default.ensureDirSync(dir);
    return dir;
}
exports.getAppHomeDir = getAppHomeDir;
//# sourceMappingURL=app.js.map