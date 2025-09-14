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
    require('./fixtures/app/require-modules-out-asar.js');
    require('./fixtures/app.asar/require-modules-out-asar.js');
    console.log(Object.keys(require.cache));
    // console.log('out-asar', require.resolve('is-absolute'));
    console.log('out-asar', require.resolve('./fixtures/app/module-out-asar'));

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
