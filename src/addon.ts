'use strict';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const addon = require('node-gyp-build')(require('path').resolve(__dirname, '../'));

export const enum FileType {
    kFile = 1,
    kDirectory = 2,
    kLink = 3,
}

export interface AsarFileStat {
    size: number;
    offset: number;
    type: FileType;
}

export interface AsarFileInfo {
    size: number;
    offset: number;
    unpacked: boolean;
    integrity?: {
        algorithm: 'SHA256';
        hash: string;
    }
}

export interface ArchiveBinding {
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new(archivePath: string): ArchiveBinding;
    getFileInfo(path: string): AsarFileInfo | false;
    stat(path: string): AsarFileStat | false;
    readdir(path: string): string[] | false;
    realpath(path: string): string | false;
    copyFileOut(path: string): string | false;
    getFdAndValidateIntegrityLater(): number | -1;
    readonly archivePath: string;
}

export type splitPath = (path: string) => (false
    | { isAsar: false }
    | { isAsar: true, asarPath: string, filePath: string }
);

export const Archive: ArchiveBinding = addon.Archive;
export const splitPath: splitPath = addon.splitPath;