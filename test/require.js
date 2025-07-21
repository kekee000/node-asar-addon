const path = require('path');
const asar = require('../lib/index');
asar.register({
    archives: [
        path.resolve(__dirname, '../node_modules.asar'),
    ]
});
asar.addAsarToLookupPaths();

const assert = require('assert');

const fs = require('fs');
const fsPromisy = require('fs/promises');

async function test() {
    assert.ok(fs.readFileSync(path.resolve(__dirname, '../node_modules.asar/semver/package.json'), 'utf8'));
    assert.ok(await fsPromisy.readFile(path.resolve(__dirname, '../node_modules.asar/semver/package.json'), 'utf8'));
    const semver = require('semver');
    console.log('semver version:', semver.SEMVER_SPEC_VERSION);
}
console.time('asar test');
test();
console.timeEnd('asar test');