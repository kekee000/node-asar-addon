/* eslint-disable @typescript-eslint/no-require-imports */
import './node/original-fs';

export interface RegisterOptions {
    /**
     * The paths to the asar archives to be registered.
     * enable fast-glob to support glob patterns like `*.asar`.
     */
    archives: string[];
    /**
     * If the archive is not found, throw an error or log a warning.
     * Default is false, which means it will write a warning log when archive is not found.
     * @default false
     */
    throwIfNoEntry?: boolean;
    /**
     * If true, the asar module will be registered as a mirror of the original fs module.
     * This is useful for compatibility with other modules that expect the original fs module.
     * @default true
     */
    mirrorAsarBasePath?: boolean;
}

export function register(options: RegisterOptions) {
    require('./node/init').register(options);
}


module.exports = {
    register,
};