/* eslint-disable @typescript-eslint/no-require-imports */
import './node/original-fs';
import {archives, getOrCreateArchive, type LoadArchiveOptions} from './node/archives';
type RegisterOptions = LoadArchiveOptions;

let _registed = false;
export function register(options: RegisterOptions) {
    if (_registed) {
        throw new Error('asar-addon already registered!');
    }
    _registed = true;
    require('./node/init').register(options);
}

module.exports = {
    register,
    getOrCreateArchive,
    archives,
};