"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLogger = exports.getLogger = exports.registerUX = exports.getUX = void 0;
let registeredUX;
let registeredLogger;
function getUX() {
    if (!registeredUX) {
        throw Error('No UX registered.');
    }
    return registeredUX;
}
exports.getUX = getUX;
function registerUX(ux) {
    registeredUX = ux;
}
exports.registerUX = registerUX;
function getLogger() {
    if (!registeredLogger) {
        throw Error('No logger registered.');
    }
    return registeredLogger;
}
exports.getLogger = getLogger;
function registerLogger(logger) {
    registeredLogger = logger;
}
exports.registerLogger = registerLogger;
//# sourceMappingURL=pubsub.js.map