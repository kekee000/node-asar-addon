console.log(require('../components/index').name);

module.exports = {
    name: 'common-index',
    mimetypes: require('mime-types'),
    mimetypeResolve: require.resolve('mime-types'),
};