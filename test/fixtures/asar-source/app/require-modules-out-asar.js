console.log('in-asar', require.resolve('is-absolute'));
console.log('in-asar', require.resolve('./module-out-asar'));
console.log('in-asar', require.resolve('@swanide/extension'));
console.log('in-asar', require.resolve('@swanide/extension/package.json'));
module.exports = {
    isAbsolute: require('is-absolute'),
    extension: require('@swanide/extension'),
    extensionJson: require('@swanide/extension/package.json'),
    moduleOutAsar: require('./module-out-asar'),
};