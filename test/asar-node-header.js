const fs = require('fs');
const path = require('path');
const {disk:{readArchiveHeaderSync}} = require('asar-node/lib/asar/index.js');
const asarFile = path.resolve(__dirname, '../node_modules.asar');
console.log('Using ASAR file:', asarFile);

console.time('readArchiveHeaderSync');
const res = readArchiveHeaderSync(asarFile);
console.timeEnd('readArchiveHeaderSync');

fs.writeFileSync('node_modules.json', JSON.stringify(res, null, 2))