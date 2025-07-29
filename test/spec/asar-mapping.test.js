/* eslint-disable max-len */
const path = require('path');
const assert = require('assert');
const asar = require('./node-asar-addon');

describe('asar archive', () => {
    before(() => {
        asar.register({
            archives: [
                path.resolve(__dirname, '../fixtures/app.asar'),
            ]
        });
    });

    describe('node path mapping app.asar', () => {
        it('test archives', function () {
            const appPath = path.resolve(__dirname, '../fixtures/app');
            const archivePath = path.resolve(__dirname, '../fixtures/app.asar');
            asar.archives.loadArchives({archives:[archivePath]});
            assert.ok(asar.archives.isArchive(archivePath), 'Archive should be recognized');
            const modulePath = asar.archives.resolveArchiveMapping(appPath + '/common/index.js');
            assert.strictEqual(modulePath, archivePath + '/common/index.js', 'Module path should match');
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
    });
});