const path = require('path');
const asar = require('../lib/index');
asar.register({
    archives: [
        path.resolve(__dirname, './fixtures/app.asar'),
    ]
});
const assert = require('assert');

const fs = require('fs');
const fsPromisy = require('fs/promises');

async function test() {
    console.log(require('./fixtures/app.asar/require-modules-out-asar.js'));
    assert.ok(fs.readFileSync(path.resolve(
        __dirname, './fixtures/app.asar/node_modules/express/package.json'), 'utf8'));
    assert.ok(await fsPromisy.readFile(path.resolve(
        __dirname, './fixtures/app.asar/node_modules/express/package.json'), 'utf8'));
    const index = require('./fixtures/app.asar/components/index');
    console.log('index version:', index);
}
console.time('asar test');
test();
console.timeEnd('asar test');