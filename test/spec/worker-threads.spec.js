/* eslint-disable max-len */
const { Worker, isMainThread, parentPort } = require('node:worker_threads');
const path = require('path');
const assert = require('assert');
const {asar, Archive} = require('./node-asar-addon');
const tmpdir = require('os').tmpdir();

const archivePath = path.resolve(__dirname, '../fixtures/*.asar');
 asar.register({
    archives: [archivePath]
});

async function runTest() {
    const tasks = [];
    const it = (description, fn) => {
        tasks.push({ description, fn });
    };

    it('test archive', function () {
        const archive = new Archive(archivePath);
        assert.strictEqual(archive.archivePath, archivePath, 'Archive path should match');
        assert.ok(archive.getFdAndValidateIntegrityLater() > 0, 'File descriptor should be valid');
        assert.ok(archive.getFileInfo('package.json').size > 0, 'getFileInfo');
        assert.ok(archive.readdir('components').includes('index.js'), 'readdir');
        assert.strictEqual(archive.realpath('index-link.js'), 'index.js', 'realpath');
        assert.ok(archive.copyFileOut('package.json').includes(`${tmpdir}/temp`), 'copyFileOut');
    });

    it('normal node_modules require', function () {
        assert.ok(require('semver').SEMVER_SPEC_VERSION, 'semver should be available');
        assert.ok(require('../fixtures/app/new-module/no-asar.js').version, 'normal module should be available');
        assert.ok(require('../fixtures/app/new-module/no-asar').version, 'normal module should be available');
        assert.ok(require.resolve('../fixtures/app/new-module/no-asar') === path.resolve(__dirname, '../fixtures/app/new-module/no-asar.js'), 'resolve module should be available');
    });

    it('require asar archive module throw mapping', function () {
        const test = require('../fixtures/app/new-module/index');
        assert.ok(test.components, 'components should be available');
        assert.ok(test.express, 'express should be available');
        assert.ok(test.semver, 'semver should be available');
    });

    it('require file in asar with mapping', function () {
        const test = require('../fixtures/app/dep.js');
        assert.ok(test.name(), 'require app.asar/dep.js');
    });

    it('require pkg in asar', function () {
        const test = require('../fixtures/app.asar/pkg');
        assert.ok(test.name(), 'require asar archive pkg app.asar/pkg');
    });

    it('require pkg in asar with mapping', function () {
        const test = require('../fixtures/app/pkg');
        assert.ok(test.name(), 'require asar archive pkg app.asar/pkg');
    });

    it('require node_modules in asar with mapping', function () {
        const test = require('../fixtures/app/new-module/require-module-in-asar.js');
        assert.ok(typeof test === 'function', 'require node_modules in asar with mapping');
    });

    it('loading local file modules when has repeat file', function () {
        const normalModule = require('../fixtures/app/common/index.js');
        const asarModule = require('../fixtures/app.asar/common');
        assert.ok(normalModule.name === 'common-index', 'loading local file modules');
        assert.ok(asarModule.name === 'common-index-in-asar', 'loading local file modules');
        assert.ok(require.resolve('../fixtures/app/common') === path.resolve(__dirname, '../fixtures/app/common/index.js'),
            'loading local node_modules');
    });

    it('loading local node_modules when has repeat module', function () {
        const normalModule = require('../fixtures/app/common/index.js');
        const asarModule = require('../fixtures/app.asar/common');
        assert.ok(normalModule.mimetypes !== asarModule.mimetypes, 'loading local node_modules');
        assert.ok(normalModule.mimetypeResolve === path.resolve(__dirname, '../fixtures/app/node_modules/mime-types/index.js'),
            'loading local node_modules');
        assert.ok(asarModule.mimetypeResolve === path.resolve(__dirname, '../fixtures/app.asar/node_modules/mime-types/index.js'),
            'loading asar node_modules');
    });

    for (const task of tasks) {
        console.log(`Test ${isMainThread ? 'main' : 'worker'}: ${task.description}`);
        await task.fn();
    }
}

if (isMainThread) {
    describe('asar in worker_threads', () => {
        it('node path mapping app.asar in main thread', () => {
           runTest();
        });
        it('node path mapping app.asar in worker thread', (done) => {
            const archive = new Archive(archivePath);
            const worker = new Worker(__filename);
            worker.on('message', (result) => {
                console.log('Worker message:', result);
                worker.terminate();

                assert.strictEqual(result.archivePath, archive.archivePath, 'Archive path should match');
                assert.ok(archive.getFdAndValidateIntegrityLater() > 0, 'File descriptor should be valid');
                assert.strictEqual(archive.getFdAndValidateIntegrityLater(), result.fd, 'File descriptor should be valid');
                done();
           });
        });
    });
}
else {
    runTest().then(() => {
        setTimeout(() => {
            const archive = new Archive(archivePath);
            parentPort.postMessage({
                archivePath: archive.archivePath,
                fd: archive.getFdAndValidateIntegrityLater(),
            });
            console.log('Worker tests completed successfully.');
        });
    })
    .catch(err => {
        console.error('Error in worker:', err);
    });
}