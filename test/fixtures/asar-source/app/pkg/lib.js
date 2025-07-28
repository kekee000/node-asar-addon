
exports.name = function() {
    return {
        name: 'lib',
        version: require('./package.json').version,
        express: require('express'),
    };
};