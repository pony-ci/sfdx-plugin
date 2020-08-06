"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrgs = exports.logoutAll = exports.sfdx = void 0;
const sfdx_node_1 = require("@pony-ci/sfdx-node");
const path_1 = __importDefault(require("path"));
const pubsub_1 = require("./pubsub");
// tslint:disable-next-line:no-any
exports.sfdx = {};
for (const p of ['force', 'pony']) {
    Object.defineProperty(exports.sfdx, p, {
        get: () => {
            if (p === 'pony' && !(p in sfdx_node_1.sfdx)) {
                sfdx_node_1.registerNamespace({
                    commandsDir: path_1.default.join(__dirname, '../../dist/commands'),
                    namespace: 'pony'
                });
            }
            return sfdx_node_1.sfdx[p];
        }
    });
}
async function logoutAll() {
    const ux = await pubsub_1.getUX();
    ux.log(`Logging out from all orgs`);
    return exports.sfdx.force.auth.logout({
        all: true,
        noprompt: true,
    });
}
exports.logoutAll = logoutAll;
async function listOrgs(options = {}) {
    const ux = await pubsub_1.getUX();
    ux.log('Listing orgs');
    return exports.sfdx.force.org.list(Object.assign({}, options));
}
exports.listOrgs = listOrgs;
//# sourceMappingURL=sfdx.js.map