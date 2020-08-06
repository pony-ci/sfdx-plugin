"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageKeyStore = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const app_1 = require("./app");
class PackageKeyStore {
    constructor(entries) {
        this.entries = entries;
    }
    static loadPackageKeyStore() {
        const file = path_1.default.join(app_1.getAppHomeDir(), 'packages/store.json');
        if (!fs_extra_1.default.existsSync(file)) {
            const store = PackageKeyStore.create();
            fs_extra_1.default.writeJSONSync(file, store);
            return store;
        }
        return fs_extra_1.default.readJSONSync(file);
    }
    static create(entries = []) {
        return new PackageKeyStore(entries);
    }
    getInstallationKey(pkg) {
        let entry = this.entries.find(it => it.type === 'subscriberPackageVersionId'
            && it.name === pkg.SubscriberPackageId);
        if (!entry) {
            entry = this.entries.find(it => it.type === 'subscriberPackageName'
                && it.name === pkg.SubscriberPackageName);
        }
        if (!entry) {
            entry = this.entries.find(it => it.type === 'subscriberPackageNamespace'
                && it.name === pkg.SubscriberPackageNamespace);
        }
        return entry === null || entry === void 0 ? void 0 : entry.key;
    }
}
exports.PackageKeyStore = PackageKeyStore;
//# sourceMappingURL=PackageKeyStore.js.map