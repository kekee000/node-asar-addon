/* eslint-disable max-len */
const path = require('path');
const assert = require('assert');
const asar = require('./node-asar-addon');

/**
 * @type {import('fs')}
 */
let fs;
let fixturesDir = path.resolve(__dirname, '../fixtures');
describe('asar archive', () => {
    before(() => {
        asar.register({
            archives: [
                path.resolve(__dirname, '../fixtures/*.asar'),
            ]
        });
        fs = require('fs');
        fs.mkdirSync('/tmp/node-asar-addon', { recursive: true });
    });
    after(() => {
        fs.rmSync('/tmp/node-asar-addon', { recursive: true });
    });


    describe('fs api native files', () => {

        it('readFileSync', function () {
            const json = JSON.parse(fs.readFileSync(path.resolve(fixturesDir, 'asar-source/app/package.json'), 'utf8'));
            assert.ok(json.version === '1.0.0', 'readFileSync should work');
            const buffer = fs.readFileSync(path.resolve(fixturesDir, 'asar-source/app/package.json'));
            assert.ok(buffer instanceof Buffer, 'readFileSync should return a Buffer');
        });
        it('readFile', function (done) {
            fs.readFile(path.resolve(fixturesDir, 'asar-source/app/package.json'), 'utf8', (err, data) => {
                assert.ifError(err);
                const json = JSON.parse(data);
                assert.ok(json.version === '1.0.0', 'readFile should work');
                done();
            });
        });
        it('readFile with Buffer', function (done) {
            fs.readFile(path.resolve(fixturesDir, 'asar-source/app/package.json'), (err, data) => {
                assert.ifError(err);
                const json = JSON.parse(data.toString('utf8'));
                assert.ok(json.version === '1.0.0', 'readFile should work');
                done();
            });
        });
        it('promises.readFile', async function () {
            const data = await fs.promises.readFile(path.resolve(fixturesDir, 'asar-source/app/package.json'), 'utf8');
            const json = JSON.parse(data);
            assert.ok(json.version === '1.0.0', 'promises.readFile should work');
        });

        it('statSync', function () {
            const stat = fs.statSync(path.resolve(fixturesDir, 'asar-source/app/pkg/lib.js'));
            assert.ok(stat.isFile(), 'statSync should return a file');
            assert.ok(stat.size > 0, 'statSync should return a valid size');
            const statDir = fs.statSync(path.resolve(fixturesDir, 'asar-source/app/pkg'));
            assert.ok(statDir.isDirectory(), 'statSync should return a dir');
        });
        it('stat', function (done) {
            fs.stat(path.resolve(fixturesDir, 'asar-source/app/pkg/lib.js'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isFile(), 'stat should return a file');
                assert.ok(stat.size > 0, 'stat should return a valid size');
                done();
            });
        });
        it('promises.stat', async function () {
            const stat = await fs.promises.stat(path.resolve(fixturesDir, 'asar-source/app/pkg/lib.js'));
            assert.ok(stat.isFile(), 'promises.stat should return a file');
            assert.ok(stat.size > 0, 'promises.stat should return a valid size');
        });
        it('stat dir', function (done) {
            fs.stat(path.resolve(fixturesDir, 'asar-source/app/pkg/'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isDirectory(), 'stat should return a dir');
                done();
            });
        });

        it('readdirSync', function () {
            const files = fs.readdirSync(path.resolve(fixturesDir, 'asar-source/app'));
            assert.ok(files.includes('package.json'), 'readdirSync should return the package.json file');
            assert.ok(files.includes('components'), 'readdirSync should return the components dir');
            const pkgFiles = fs.readdirSync(path.resolve(fixturesDir, 'asar-source/app/pkg'));
            assert.ok(pkgFiles.includes('lib.js'), 'readdirSync should return the lib.js file');
            // recrusive
            const allFiles = fs.readdirSync(path.resolve(fixturesDir, 'asar-source/app/node_modules/express'), { recursive: true });
            assert.ok(allFiles.includes('lib/express.js'), 'readdirSync should return files in subdirectories');
        });
        it('readdir dir', function (done) {
            fs.readdir(path.resolve(fixturesDir, 'asar-source/app/pkg'), (err, files) => {
                assert.ifError(err);
                assert.ok(files.includes('lib.js'), 'readdir should return the lib.js file');
                done();
            });
            // recrusive
            fs.readdir(path.resolve(fixturesDir, 'asar-source/app/node_modules/express'), { recursive: true }, (err, allFiles) => {
                assert.ifError(err);
                assert.ok(allFiles.includes('lib/express.js'), 'readdir should return files in subdirectories');
            });
        });
        it('promises.readdir', async function () {
            const files = await fs.promises.readdir(path.resolve(fixturesDir, 'asar-source/app'));
            assert.ok(files.includes('package.json'), 'promises.readdir should return the package.json file');
            const pkgFiles = await fs.promises.readdir(path.resolve(fixturesDir, 'asar-source/app/pkg'));
            assert.ok(pkgFiles.includes('lib.js'), 'promises.readdir should return the lib.js file');
            // recrusive
            const allFiles = await fs.promises.readdir(path.resolve(fixturesDir, 'asar-source/app/node_modules/express'), { recursive: true });
            assert.ok(allFiles.includes('lib/express.js'), 'promises.readdir should return files in subdirectories');
        });

        it('existsSync', function () {
            assert.ok(fs.existsSync(path.resolve(fixturesDir, 'asar-source/app/package.json')), 'existsSync should return true for package.json');
            assert.ok(!fs.existsSync(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json')), 'existsSync should return false for nonexistent file');
        });
        it('exists', function (done) {
            fs.exists(path.resolve(fixturesDir, 'asar-source/app/package.json'), (exists) => {
                assert.ok(exists, 'exists should return true for package.json');
                fs.exists(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json'), (exists) => {
                    assert.ok(!exists, 'exists should return false for nonexistent file');
                    done();
                });
            });
        });
        it('promises.exists', async function () {
            const exists = await fs.promises.access(path.resolve(fixturesDir, 'asar-source/app/package.json'), fs.constants.F_OK);
            assert.ok(!exists, 'promises.exists should not throw for existing file');
            try {
                await fs.promises.access(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json'), fs.constants.F_OK);
                assert.fail('promises.exists should throw for nonexistent file');
            } catch (err) {
                assert.ok(err.code === 'ENOENT', 'promises.exists should throw ENOENT for nonexistent file');
            }
        });

        it('lstatSync', function () {
            const stat = fs.lstatSync(path.resolve(fixturesDir, 'asar-source/app/index-link.js'));
            assert.ok(stat.isSymbolicLink(), 'lstatSync should return a symlink');
        });
        it('lstat', function (done) {
            fs.lstat(path.resolve(fixturesDir, 'asar-source/app/index-link.js'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isSymbolicLink(), 'lstat should return a symlink');
                done();
            });
        });
        it('promises.lstat', async function () {
            const stat = await fs.promises.lstat(path.resolve(fixturesDir, 'asar-source/app/index-link.js'));
            assert.ok(stat.isSymbolicLink(), 'promises.lstat should return a symlink');
        });

        it('realpathSync', function () {
            const realPath = fs.realpathSync(path.resolve(fixturesDir, 'asar-source/app/index-link.js'));
            assert.ok(realPath.includes('asar-source/app/index.js'), 'realpathSync should resolve symlink to real path');
        });
        it('realpath', function (done) {
            fs.realpath(path.resolve(fixturesDir, 'asar-source/app/index-link.js'), (err, realPath) => {
                assert.ifError(err);
                assert.ok(realPath.includes('asar-source/app/index.js'), 'realpath should resolve symlink to real path');
                done();
            });
        });
        it('promises.realpath', async function () {
            const realPath = await fs.promises.realpath(path.resolve(fixturesDir, 'asar-source/app/index-link.js'));
            assert.ok(realPath.includes('asar-source/app/index.js'), 'promises.realpath should resolve symlink to real path');
        });

        it('copyFileSync', function () {
            const srcPath = path.resolve(fixturesDir, 'asar-source/app/package.json');
            const destPath = '/tmp/node-asar-addon/copied_package.json';
            fs.copyFileSync(srcPath, destPath);
            assert.ok(fs.existsSync(destPath), 'copyFileSync should copy the file');
            fs.unlinkSync(destPath); // Clean up
        });
        it('copyFile', function (done) {
            const srcPath = path.resolve(fixturesDir, 'asar-source/app/package.json');
            const destPath = '/tmp/node-asar-addon/copied_package.json';
            fs.copyFile(srcPath, destPath, (err) => {
                assert.ifError(err);
                assert.ok(fs.existsSync(destPath), 'copyFile should copy the file');
                fs.unlink(destPath, done); // Clean up
            });
        });
        it('promises.copyFile', async function () {
            const srcPath = path.resolve(fixturesDir, 'asar-source/app/package.json');
            const destPath = '/tmp/node-asar-addon/copied_package.json';
            await fs.promises.copyFile(srcPath, destPath);
            assert.ok(fs.existsSync(destPath), 'promises.copyFile should copy the file');
        });

        it('accessSync', function () {
            assert.doesNotThrow(() => {
                fs.accessSync(path.resolve(fixturesDir, 'asar-source/app/package.json'), fs.constants.R_OK);
            }, 'accessSync should not throw for readable file');
            assert.throws(() => {
                fs.accessSync(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json'), fs.constants.R_OK);
            }, 'accessSync should throw for nonexistent file');
        });
        it('access', function (done) {
            fs.access(path.resolve(fixturesDir, 'asar-source/app/package.json'), fs.constants.R_OK, (err) => {
                assert.ifError(err, 'access should not return an error for readable file');
                fs.access(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json'), fs.constants.R_OK, (err) => {
                    assert.ok(err, 'access should return an error for nonexistent file');
                    done();
                });
            });
        });
        it('promises.access', async function () {
            await fs.promises.access(path.resolve(fixturesDir, 'asar-source/app/package.json'), fs.constants.R_OK);
            try {
                await fs.promises.access(path.resolve(fixturesDir, 'asar-source/app/nonexistent.json'), fs.constants.R_OK);
                assert.fail('promises.access should throw for nonexistent file');
            } catch (err) {
                assert.ok(err.code === 'ENOENT', 'promises.access should throw ENOENT for nonexistent file');
            }
        });
    });

    describe('fs api asar file', () => {
        it('readFileSync', function () {
            const json = JSON.parse(fs.readFileSync(path.resolve(fixturesDir, 'app.asar/package.json'), 'utf8'));
            assert.ok(json.version === '1.0.0', 'readFileSync should work');
            const buffer = fs.readFileSync(path.resolve(fixturesDir, 'app.asar/package.json'));
            assert.ok(buffer instanceof Buffer, 'readFileSync should return a Buffer');
        });
        it('readFile', function (done) {
            fs.readFile(path.resolve(fixturesDir, 'app.asar/package.json'), 'utf8', (err, data) => {
                assert.ifError(err);
                const json = JSON.parse(data);
                assert.ok(json.version === '1.0.0', 'readFile should work');
                done();
            });
        });
        it('readFile with Buffer', function (done) {
            fs.readFile(path.resolve(fixturesDir, 'app.asar/package.json'), (err, data) => {
                assert.ifError(err);
                const json = JSON.parse(data.toString('utf8'));
                assert.ok(json.version === '1.0.0', 'readFile should work');
                done();
            });
        });
        it('promises.readFile', async function () {
            const data = await fs.promises.readFile(path.resolve(fixturesDir, 'app.asar/package.json'), 'utf8');
            const json = JSON.parse(data);
            assert.ok(json.version === '1.0.0', 'promises.readFile should work');
        });

        it('statSync', function () {
            const stat = fs.statSync(path.resolve(fixturesDir, 'app.asar/pkg/lib.js'));
            assert.ok(stat.isFile(), 'statSync should return a file');
            assert.ok(stat.size > 0, 'statSync should return a valid size');
            const statDir = fs.statSync(path.resolve(fixturesDir, 'app.asar/pkg'));
            assert.ok(statDir.isDirectory(), 'statSync should return a dir');
        });
        it('stat', function (done) {
            fs.stat(path.resolve(fixturesDir, 'app.asar/pkg/lib.js'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isFile(), 'stat should return a file');
                assert.ok(stat.size > 0, 'stat should return a valid size');
                done();
            });
        });
        it('promises.stat', async function () {
            const stat = await fs.promises.stat(path.resolve(fixturesDir, 'app.asar/pkg/lib.js'));
            assert.ok(stat.isFile(), 'promises.stat should return a file');
            assert.ok(stat.size > 0, 'promises.stat should return a valid size');
        });
        it('stat dir', function (done) {
            fs.stat(path.resolve(fixturesDir, 'app.asar/pkg/'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isDirectory(), 'stat should return a dir');
                done();
            });
        });

        it('readdirSync', function () {
            const files = fs.readdirSync(path.resolve(fixturesDir, 'app.asar'));
            assert.ok(files.includes('package.json'), 'readdirSync should return the package.json file');
            assert.ok(files.includes('components'), 'readdirSync should return the components dir');
            const pkgFiles = fs.readdirSync(path.resolve(fixturesDir, 'app.asar/pkg'));
            assert.ok(pkgFiles.includes('lib.js'), 'readdirSync should return the lib.js file');
            // recrusive
            const allFiles = fs.readdirSync(path.resolve(fixturesDir, 'app.asar/node_modules/express'), { recursive: true });
            assert.ok(allFiles.includes('lib/express.js'), 'readdirSync should return files in subdirectories');
        });
        it('readdir', function (done) {
            fs.readdir(path.resolve(fixturesDir, 'app.asar'), (err, files) => {
                assert.ifError(err);
                assert.ok(files.includes('package.json'), 'readdir should return the package.json file');
                done();
            });
            // recrusive
            fs.readdir(path.resolve(fixturesDir, 'app.asar/node_modules/express'), { recursive: true }, (err, allFiles) => {
                assert.ifError(err);
                assert.ok(allFiles.includes('lib/express.js'), 'readdir should return files in subdirectories');
            });
        });
        it('readdir dir', function (done) {
            fs.readdir(path.resolve(fixturesDir, 'app.asar/pkg'), (err, files) => {
                assert.ifError(err);
                assert.ok(files.includes('lib.js'), 'readdir should return the lib.js file');
                done();
            });
        });
        it('promises.readdir', async function () {
            const files = await fs.promises.readdir(path.resolve(fixturesDir, 'app.asar'));
            assert.ok(files.includes('package.json'), 'promises.readdir should return the package.json file');
            const pkgFiles = await fs.promises.readdir(path.resolve(fixturesDir, 'app.asar/pkg'));
            assert.ok(pkgFiles.includes('lib.js'), 'promises.readdir should return the lib.js file');
            // recrusive
            const allFiles = await fs.promises.readdir(path.resolve(fixturesDir, 'app.asar/node_modules/express'), { recursive: true });
            assert.ok(allFiles.includes('lib/express.js'), 'promises.readdir should return files in subdirectories');
        });

        it('existsSync', function () {
            assert.ok(fs.existsSync(path.resolve(fixturesDir, 'app.asar/package.json')), 'existsSync should return true for package.json');
            assert.ok(!fs.existsSync(path.resolve(fixturesDir, 'app.asar/nonexistent.json')), 'existsSync should return false for nonexistent file');
        });
        it('exists', function (done) {
            fs.exists(path.resolve(fixturesDir, 'app.asar/package.json'), (exists) => {
                assert.ok(exists, 'exists should return true for package.json');
                fs.exists(path.resolve(fixturesDir, 'app.asar/nonexistent.json'), (exists) => {
                    assert.ok(!exists, 'exists should return false for nonexistent file');
                    done();
                });
            });
        });
        it('promises.exists', async function () {
            const exists = await fs.promises.access(path.resolve(fixturesDir, 'app.asar/package.json'), fs.constants.F_OK);
            assert.ok(!exists, 'promises.exists should not throw for existing file');
            try {
                await fs.promises.access(path.resolve(fixturesDir, 'app.asar/nonexistent.json'), fs.constants.F_OK);
                assert.fail('promises.exists should throw for nonexistent file');
            } catch (err) {
                assert.ok(err.code === 'ENOENT', 'promises.exists should throw ENOENT for nonexistent file');
            }
        });

        it('lstatSync', function () {
            const stat = fs.lstatSync(path.resolve(fixturesDir, 'app.asar/index-link.js'));
            assert.ok(stat.isSymbolicLink(), 'lstatSync should return a symlink');
        });
        it('lstat', function (done) {
            fs.lstat(path.resolve(fixturesDir, 'app.asar/index-link.js'), (err, stat) => {
                assert.ifError(err);
                assert.ok(stat.isSymbolicLink(), 'lstat should return a symlink');
                done();
            });
        });
        it('promises.lstat', async function () {
            const stat = await fs.promises.lstat(path.resolve(fixturesDir, 'app.asar/index-link.js'));
            assert.ok(stat.isSymbolicLink(), 'promises.lstat should return a symlink');
        });

        it('realpathSync', function () {
            const realPath = fs.realpathSync(path.resolve(fixturesDir, 'app.asar/index-link.js'));
            assert.ok(realPath.includes('app.asar/index.js'), 'realpathSync should resolve symlink to real path');
        });
        it('realpath', function (done) {
            fs.realpath(path.resolve(fixturesDir, 'app.asar/index-link.js'), (err, realPath) => {
                assert.ifError(err);
                assert.ok(realPath.includes('app.asar/index.js'), 'realpath should resolve symlink to real path');
                done();
            });
        });
        it('promises.realpath', async function () {
            const realPath = await fs.promises.realpath(path.resolve(fixturesDir, 'app.asar/index-link.js'));
            assert.ok(realPath.includes('app.asar/index.js'), 'promises.realpath should resolve symlink to real path');
        });

        it('copyFileSync', function () {
            const srcPath = path.resolve(fixturesDir, 'app.asar/package.json');
            const destPath = path.resolve(fixturesDir, '/tmp/node-asar-addon/copied_package.json');
            fs.copyFileSync(srcPath, destPath);
            assert.ok(fs.existsSync(destPath), 'copyFileSync should copy the file');
            fs.unlinkSync(destPath); // Clean up
        });
        it('copyFile', function (done) {
            const srcPath = path.resolve(fixturesDir, 'app.asar/package.json');
            const destPath = path.resolve(fixturesDir, '/tmp/node-asar-addon/copied_package.json');
            fs.copyFile(srcPath, destPath, (err) => {
                assert.ifError(err);
                assert.ok(fs.existsSync(destPath), 'copyFile should copy the file');
                fs.unlink(destPath, done); // Clean up
            });
        });
        it('promises.copyFile', async function () {
            const srcPath = path.resolve(fixturesDir, 'app.asar/package.json');
            const destPath = '/tmp/node-asar-addon/copied_package.json';
            await fs.promises.copyFile(srcPath, destPath);
            assert.ok(fs.existsSync(destPath), 'promises.copyFile should copy the file');
        });


        it('accessSync', function () {
            assert.doesNotThrow(() => {
                fs.accessSync(path.resolve(fixturesDir, 'app.asar/package.json'), fs.constants.R_OK);
            }, 'accessSync should not throw for readable file');
            assert.throws(() => {
                fs.accessSync(path.resolve(fixturesDir, 'app.asar/nonexistent.json'), fs.constants.R_OK);
            }, 'accessSync should throw for nonexistent file');
        });
        it('access', function (done) {
            fs.access(path.resolve(fixturesDir, 'app.asar/package.json'), fs.constants.R_OK, (err) => {
                assert.ifError(err, 'access should not return an error for readable file');
                fs.access(path.resolve(fixturesDir, 'app.asar/nonexistent.json'), fs.constants.R_OK, (err) => {
                    assert.ok(err, 'access should return an error for nonexistent file');
                    done();
                });
            });
        });
        it('promises.access', async function () {
            await fs.promises.access(path.resolve(fixturesDir, 'app.asar/package.json'), fs.constants.R_OK);
            try {
                await fs.promises.access(path.resolve(fixturesDir, 'app.asar/nonexistent.json'), fs.constants.R_OK);
                assert.fail('promises.access should throw for nonexistent file');
            } catch (err) {
                assert.ok(err.code === 'ENOENT', 'promises.access should throw ENOENT for nonexistent file');
            }
        });
    });
});