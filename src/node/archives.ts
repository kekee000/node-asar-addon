import { getValidatedPath } from './internal';
import { existsSync, statSync } from './original-fs';
import path from 'path';
import * as asar from '../addon';

export const isAsarDisabled = (): boolean => !!(process.noAsar || process.env.ELECTRON_NO_ASAR);

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


class AsarArchives {
  private _archives: Map<string, number>;
  private _lookups: Set<string>;
  constructor() {
    this._archives = new Map();
    this._lookups = new Set();
  }

  private _addArchive(archivePath: string) {
    if (existsSync(archivePath) && statSync(archivePath).isFile()) {
      this._archives.set(archivePath, 1);
      if (archivePath.endsWith('node_modules.asar')) {
        this._lookups.add(archivePath.slice(0, -5));
      }
    } else {
      throw new Error(`Archive not found or is not a file: ${archivePath}`);
    }
  }

  loadArchives(paths: string[]) {
    if (!Array.isArray(paths)) {
      throw new TypeError('Archives paths should be an array of strings');
    }
    for (const asarPath of paths) {
      if (asarPath.includes('*.asar')) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('fast-glob').sync(asarPath, { onlyFiles: true }).forEach((resolvedPath) => {
          this._addArchive(path.resolve(resolvedPath));
        });
      }
      else {
        this._addArchive(path.resolve(asarPath));
      }
    }
  }

  isArchive(archivePath: string) {
    return this._archives.has(archivePath);
  }

  isLookup(lookupPath: string) {
    return this._lookups.has(lookupPath);
  }
}

const archives = new AsarArchives();

const asarRe = /\.asar/i;
const asarExt = /\.asar$/i;

// Separate asar package's path from full path.
export const splitPath = (archivePathOrBuffer: string | Buffer | URL): ({
  isAsar: false;
} | {
  isAsar: true;
  asarPath: string;
  filePath: string;
}) => {
  // Shortcut for disabled asar.
  if (isAsarDisabled()) return { isAsar: false };

  // Check for a bad argument type.
  let archivePath = archivePathOrBuffer;
  if (Buffer.isBuffer(archivePathOrBuffer)) {
    archivePath = archivePathOrBuffer.toString();
  }
  if (archivePath instanceof URL) {
    archivePath = getValidatedPath(archivePath);
  }
  if (typeof archivePath !== 'string') return { isAsar: <const>false };
  if (!asarRe.test(archivePath)) return { isAsar: <const>false };
  if (asarExt.test(archivePath) && !archives.isArchive(archivePath)) {
    return { isAsar: false };
  }
  const res = asar.splitPath(path.normalize(archivePath));
  if (false === res) {
    throw new Error(`Invalid asar archive path: ${archivePath}`);
  }
  return res;
};

export default archives;