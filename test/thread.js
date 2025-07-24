const {Worker, isMainThread} = require('worker_threads');
const {Archive} = require('../lib/addon.js');
const path = require('path');
const asarFile = path.resolve(__dirname, 'fixtures/app.asar');
const assert = require('assert');

function bootstrap(asarFile) {
    console.log('Using ASAR file:', asarFile);

    console.time(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync`);
    const archive = new Archive(asarFile);
    console.timeEnd(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync`);

    const filePath = 'components/index.js';
    const fileInfo = archive.getFileInfo(filePath);
    assert.ok(fileInfo, 'File info should not be null');
    console.log(filePath, 'fileInfo', fileInfo);

    const statInfo = archive.stat(filePath);
    assert.ok(statInfo.type === 1, 'Stat info should not be null');
    console.log(filePath, 'statInfo', statInfo);

    const dirs = archive.readdir('node_modules/express');
    assert.ok(dirs.length > 0, 'Directory listing should not be null');
    console.log('readdir node_modules/express', dirs);
}
console.time(`${isMainThread ? 'main:' : 'worker'}:bootstrap`);
bootstrap(asarFile);
 console.timeEnd(`${isMainThread ? 'main:' : 'worker'}:bootstrap`);

if (isMainThread) {
    const worker = new Worker(__filename, {
        workerData: {asarFile}
    });
    worker.on('message', (msg) => {
        console.log('Worker message:', msg);
    });
}