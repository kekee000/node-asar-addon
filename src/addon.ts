'use strict';
const addon =  require('node-gyp-build')(require('path').resolve(__dirname, '../'));

export const enum FileType {
    kFile = 1,
    kDirectory = 2,
    kLink = 3,
}

export interface ArchiveBinding {
    new(archivePath: string): ArchiveBinding;
    getFileInfo(filePath: string): {size: number, offset: number, unpacked: boolean};
    stat(filePath: string): {size: number, offset: number, type: FileType};
    readdir(dirPath: string): string[];
    realpath(filePath: string): string;
    copyFileOut(filePath: string,): string;
    GetFD(): number;
    readonly archivePath: string;
}

export type splitPath = (path: string)=> {isAsar: boolean, archivePath: string, filePath: string};

export const Archive: ArchiveBinding = addon.Archive;
export const splitPath: splitPath = addon.splitPath;