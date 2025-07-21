node-asar-addon
====

The node-asar-addon module enables Node.js to ‌load modules from ASAR files‌. It supports ‌sharing ASAR archives across worker_threads‌, which can ‌reduce 50% memory usage for ASAR files in large projects.

This project contains ‌code partially extracted from‌ Electron's asar module, ‌with added support for‌ Node.js modules.

## Usage

```javascript
const asar = require('node-asar-addon');
// register asar files
asar.register({
    archives: [
        './app.asar',
        './node_modules.asar'
    ]
});
// add node_modules.asar to lookup path, enable require modules from node_modules.asar
asar.addAsarToLookupPaths();

require('./app.asar/index.js');
```

## Requirement

- Node >= 20.0
- Compiled with C++17

## Build

> npm run build

**Build Addon**

> npm run build:addon

**Build Lib**

> npm run build:ts

## Test

> npm run build:test && npm test


## Related Projects
- [electron](https://github.com/electron/electron)
- [asar-node](https://github.com/toyobayashi/asar-node)