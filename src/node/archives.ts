import { getValidatedPath } from './internal';
import { statSync } from './original-fs';
import path from 'path';
import * as asar from '../addon';

export interface LoadArchiveOptions {
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

// Cache asar archive objects.
const cachedArchives = new Map<string, asar.ArchiveBinding>();

export const getOrCreateArchive = (archivePath: string) => {
  const isCached = cachedArchives.has(archivePath);
  if (isCached) {
    return cachedArchives.get(archivePath)!;
  }

  try {
    const newArchive = new asar.Archive(archivePath);
    cachedArchives.set(archivePath, newArchive);
    return newArchive;
  } catch {
    return null;
  }
};

export const enum ArchiveType {
  File = 1,
  Directory = 2,
}

class AsarArchives {
  private _archives: Map<string, ArchiveType>;
  private _mappingLookups: Map<string, string>;
  _isAsarDisabled = false;

  constructor() {
    this._archives = new Map();
    this._mappingLookups = new Map();
  }

  private _addMappingLookup(archivePath: string) {
    const mappingDir = archivePath.replace(/\.asar/i, '');
    this._mappingLookups.set(mappingDir, archivePath);
    const info = statSync(mappingDir, {throwIfNoEntry: false});
    console.info(`[Info] AsarArchives: Asar mapping lookup added: ${
      archivePath} -> ${mappingDir}${info ? ' (mixed dir)' : ' (mirror dir)'}`);
  }

  private _addArchive(archiveFile: string, options: {mirrorAsarBasePath: boolean, throwIfNoEntry: boolean}) {
    if (this._archives.has(archiveFile)) {
      console.warn(`[Warning] AsarArchives: Archive already registered: ${archiveFile}`);
      return;
    }
    const fileInfo = statSync(archiveFile, {throwIfNoEntry: false});
    if (!fileInfo) {
      if (options.throwIfNoEntry) {
        throw new Error(`Asar archive not found: ${archiveFile}`);
      }
      else {
        console.warn(`[Warning] AsarArchives: Archive not found: ${archiveFile}`);
      }
    }
    else if (fileInfo.isFile()) {
      this._archives.set(archiveFile, ArchiveType.File);
      if (options.mirrorAsarBasePath) {
        this._addMappingLookup(archiveFile);
      }
    }
    else if (fileInfo.isDirectory()) {
      this._archives.set(archiveFile, ArchiveType.Directory);
      console.warn(`[Warning] AsarArchives: ${
        archiveFile} is a directory, asar module mapping will also being enabled.`);
      if (options.mirrorAsarBasePath) {
        this._addMappingLookup(archiveFile);
      }
    }
  }

  loadArchives(options: LoadArchiveOptions) {
    const paths = options.archives || [];
    const throwIfNoEntry = !!options.throwIfNoEntry;
    const mirrorAsarBasePath = options.mirrorAsarBasePath !== false;

    if (!Array.isArray(paths)) {
      throw new TypeError('Archives paths should be an array of strings');
    }
    for (const asarPath of paths) {
      if (asarPath.includes('*.asar')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('fast-glob').sync(asarPath, { onlyFiles: true }).forEach((resolvedPath: string) => {
          this._addArchive(path.resolve(resolvedPath), {throwIfNoEntry, mirrorAsarBasePath});
        });
      }
      else {
        this._addArchive(path.resolve(asarPath), {throwIfNoEntry, mirrorAsarBasePath});
      }
    }
  }

  isArchive(archiveFile: string) {
    if (!archiveFile.endsWith('.asar')) {
      archiveFile = archiveFile.slice(0, (archiveFile.match(/\.asar/i)?.index || archiveFile.length) + 5 );
    }
    return this._archives.get(archiveFile) === ArchiveType.File;
  }

  resolveArchiveMapping(filepath: string): string | null {
    if (!this._mappingLookups.size) return null;
    for (const [lookupDir, asarFile] of this._mappingLookups) {
      if (filepath.startsWith(lookupDir)) {
        return asarFile + filepath.slice(lookupDir.length);
      }
    }
    return null;
  }
}

export const archives = new AsarArchives();

export const asarRe = /\.asar(?:\/|\\|$)/i;

// Separate asar package's path from full path.
export const splitPath = (archivePathOrBuffer: string | Buffer | URL): ({
  isAsar: false;
} | {
  isAsar: true;
  asarPath: string;
  filePath: string;
}) => {
  // Shortcut for disabled asar.
  if (archives._isAsarDisabled) return { isAsar: false };

  // Check for a bad argument type.
  let archivePath = archivePathOrBuffer;
  if (Buffer.isBuffer(archivePathOrBuffer)) {
    archivePath = archivePathOrBuffer.toString();
  }
  else if (archivePath instanceof URL) {
    archivePath = getValidatedPath(archivePath);
  }

  if (typeof archivePath !== 'string') return { isAsar: <const>false };

  if (!asarRe.test(archivePath)) return { isAsar: <const>false };

  if (!archives.isArchive(archivePath)) {
    return { isAsar: false };
  }

  const res = asar.splitPath(path.normalize(archivePath));
  if (false === res) {
    throw new Error(`Invalid asar archive path: ${archivePath}`);
  }
  return res;
};