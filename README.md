node-asar-addon
====

The node-asar-addon module enables Node.js to ‌load modules from ASAR files‌. It supports ‌sharing ASAR archives across worker_threads‌,
enable module mappings between native filesystem and asar filesystem.

This project contains ‌code partially extracted from‌ Electron's asar module.

## Features

- Uses C++ addon to manage asar files, supporting sharing of meta information across different worker_threads.
- Supports module lookup path mapping, enabling smooth migration of existing module code to asar format.
- Minimal impact on existing module loading, high speed.

## Usage

```javascript
const asar = require('node-asar-addon');
// register asar files
asar.register({
    archives: [
        // mapping /app.asar/xxx => /app/xxx
        './app.asar',
        // use fast-glob to get asar archives, need to install peerDependencies "fast-glob"
        './*.asar',
    ]
});

// require module in asar
const indexAsar = require('./app.asar/index.js');
// require module in asar through module mapping
const index = require('./app/index.js');
// console.log(indexAsar === index)
// result: true
```

**Notice:** node-asar-addon only support commonjs modules, not support es modules.


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