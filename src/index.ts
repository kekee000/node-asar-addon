/* eslint-disable @typescript-eslint/no-require-imports */
import './node/original-fs';
import {getOrCreateArchive, type LoadArchiveOptions} from './node/archives';
type RegisterOptions = LoadArchiveOptions;

export function register(options: RegisterOptions) {
    require('./node/init').register(options);
}

module.exports = {
    register,
    getOrCreateArchive,
};