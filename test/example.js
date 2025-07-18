const {Worker, isMainThread} = require('worker_threads');
const {Archive} = require('../lib/addon.js');
const fs = require('fs');
const path = require('path');
const asarFile = path.resolve(__dirname, '../node_modules.asar');

function readFileFromAchive(archive, filePath, info) {
    const buffer = Buffer.alloc(info.size);
    const fd = archive.getFdAndValidateIntegrityLater();
    if (!(fd >= 0)) {
        throw new Error(`Failed to get file descriptor for ASAR archive: ${archive.archivePath}`);
    }

    console.log(archive.archivePath, filePath, info.offset);
    fs.readSync(fd, buffer, 0, info.size, info.offset);
    return buffer.toString();
}

function bootstrap(asarFile) {
    console.log('Using ASAR file:', asarFile);

    console.time(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync`);
    const archive = new Archive(asarFile);
    console.timeEnd(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync`);

    console.time(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync1`);
    new Archive(asarFile);
    console.timeEnd(`${isMainThread ? 'main:' : 'worker'}:readArchiveHeaderSync1`);

    const filePath = 'semver/package.json';
    const fileInfo = archive.getFileInfo(filePath);
    console.log(filePath, 'fileInfo', fileInfo);

    const statInfo = archive.stat(filePath);
    console.log(filePath, 'statInfo', statInfo);

    console.log('semver/package.json content:', readFileFromAchive(archive, filePath, fileInfo));

    const dirs = archive.readdir('readable-stream/lib/internal/streams');
    console.log('readdir readable-stream/lib/internal/streams', dirs);
}

bootstrap(asarFile);

if (isMainThread) {
    const worker = new Worker(__filename, {
        workerData: {asarFile}
    });
    worker.on('message', (msg) => {
        console.log('Worker message:', msg);
    });
}