const path = require('path');
const asar = require('../lib/index');
asar.register({
    archives: [
        path.resolve(__dirname, 'fixtures/*.asar'),
    ]
});

const assert = require('assert');

async function mapping() {
    assert.ok(require('semver').SEMVER_SPEC_VERSION);
    const test = require('./fixtures/app/new-module/index');
    assert.ok(test.components);
    assert.ok(test.express);
    assert.ok(test.semver);
    // console.log(Object.keys(require.cache));
}
console.time('asar test');
mapping();
console.timeEnd('asar test');