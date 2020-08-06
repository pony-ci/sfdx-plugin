"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const PonyCommand_1 = __importDefault(require("../lib/PonyCommand"));
const DESCRIPTION = `Automate your application lifecycle.

* Docs: https://pony-ci.github.io/pony-ci
* Plugin Repository: https://github.com/pony-ci/sfdx-plugin
* Plugin Issues: https://github.com/pony-ci/sfdx-plugin/issues
`;
let PonyBaseCommand = /** @class */ (() => {
    class PonyBaseCommand extends PonyCommand_1.default {
        async run() {
            const ux = await __1.getUX();
            ux.log(DESCRIPTION);
        }
    }
    // public static readonly description: string = DESCRIPTION;
    PonyBaseCommand.theDescription = DESCRIPTION;
    PonyBaseCommand.longDescription = DESCRIPTION;
    PonyBaseCommand.help = DESCRIPTION;
    PonyBaseCommand.readonly = DESCRIPTION;
    PonyBaseCommand.flagsConfig = {};
    return PonyBaseCommand;
})();
exports.default = PonyBaseCommand;
//# sourceMappingURL=pony.js.map