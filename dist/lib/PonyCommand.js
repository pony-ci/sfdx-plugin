"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@salesforce/command");
const ts_types_1 = require("@salesforce/ts-types");
const os_1 = require("os");
const general_1 = require("../type-guards/general");
const pubsub_1 = require("./pubsub");
const run = async (that, ux, logger, thatRun) => {
    try {
        pubsub_1.registerUX(ux);
        pubsub_1.registerLogger(logger);
        return await thatRun.bind(that)();
    }
    catch (e) {
        throw preprocessError(e);
    }
};
class PonyCommand extends command_1.SfdxCommand {
    constructor(arg1, arg2) {
        super(arg1, arg2);
        const thatRun = this.run;
        this.run = () => run(this, this.ux, this.logger, thatRun);
    }
    get commandName() {
        return this.constructor.name.substr(0, this.constructor.name.length - 'Command'.length);
    }
}
exports.default = PonyCommand;
function preprocessError(errors) {
    if (errors instanceof String || errors instanceof Error) {
        return errors;
    }
    if (ts_types_1.isPlainObject(errors) && general_1.hasProp(errors, 'commandName') && general_1.hasProp(errors, 'message')) {
        return (errors.commandName ? `[${errors.commandName}] ` : '') + errors.message;
    }
    if (ts_types_1.isArray(errors)) {
        if (errors.length === 1) {
            return preprocessError(errors[0]);
        }
        if (errors.every(it => ts_types_1.isPlainObject(it) && 'commandName' in it && 'message' in it)) {
            return errors.map(preprocessError).join(os_1.EOL + os_1.EOL);
        }
        return JSON.stringify(errors, null, 4);
    }
    return JSON.stringify(errors, null, 4);
}
//# sourceMappingURL=PonyCommand.js.map