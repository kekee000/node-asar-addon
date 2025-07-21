import './node/original-fs';

export function register(options: { archives: string[] }) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./node/init').register(options);
}

export function addAsarToLookupPaths() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./node/init').addAsarToLookupPaths();
}

module.exports = {
    register,
    addAsarToLookupPaths,
};