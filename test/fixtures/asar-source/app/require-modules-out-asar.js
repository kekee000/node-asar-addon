console.log('in-asar', require.resolve('is-absolute'));
console.log('in-asar', require.resolve('./module-out-asar'));

module.exports = {
    isAbsolute: require('is-absolute'),
    moduleOutAsar: require('./module-out-asar'),
};