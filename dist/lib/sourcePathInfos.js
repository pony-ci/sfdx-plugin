"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSourcePathInfos = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_extra_1 = require("fs-extra");
const path_1 = __importDefault(require("path"));
const slash_1 = __importDefault(require("slash"));
const pubsub_1 = require("./pubsub");
async function updateSourcePathInfos(projectDir, username, files) {
    const ux = await pubsub_1.getUX();
    const infosFile = path_1.default.join(projectDir, `.sfdx/orgs/${username}/sourcePathInfos.json`);
    if (!fs_extra_1.existsSync(infosFile)) {
        throw Error(`File not found: ${infosFile}`);
    }
    const infos = fs_extra_1.readJSONSync(infosFile);
    const updated = new Set();
    const updates = [];
    files
        .map(slash_1.default)
        .forEach((file) => {
        infos
            .filter(([infoPath]) => !updated.has(infoPath))
            .filter(([infoPath]) => slash_1.default(infoPath) === file || slash_1.default(infoPath).startsWith(file))
            .forEach(([infoPath, infoData]) => {
            try {
                const data = fs_extra_1.readFileSync(file).toString();
                infoData.contentHash = hash(data);
                updates.push(file);
            }
            catch (e) {
                ux.warn(e);
            }
            updated.add(infoPath);
        });
    });
    if (updates.length) {
        ux.log(`Updating source path info hashes to sync the source with scratch org`);
    }
    updates.forEach((it, idx, array) => {
        ux.log(`  ${idx === array.length - 1 ? '└' : '├'} ${path_1.default.relative(projectDir, it)}`);
    });
    fs_extra_1.writeJSONSync(infosFile, infos);
}
exports.updateSourcePathInfos = updateSourcePathInfos;
function hash(data) {
    const shasum = crypto_1.default.createHash('sha1');
    shasum.update(data);
    return shasum.digest('hex');
}
//# sourceMappingURL=sourcePathInfos.js.map