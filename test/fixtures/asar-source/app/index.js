console.time('asar-index');
console.log(require('./components/index').name);
console.timeEnd('asar-index');

module.exports = {
    name: 'index-in-asar',
};