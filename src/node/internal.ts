import assert from "assert";
import {join} from "path";

let fs: typeof import('fs');
function lazyLoadFs() {
  if (!fs) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fs = require('fs');
  }
  return fs;
}

const UV_DIRENT_UNKNOWN = 0;
const UV_DIRENT_FILE = 1;
const UV_DIRENT_DIR = 2;
const UV_DIRENT_LINK = 3;
const UV_DIRENT_FIFO = 4;
const UV_DIRENT_SOCKET = 5;
const UV_DIRENT_CHAR = 6;
const UV_DIRENT_BLOCK = 7;

const kEmptyObject = Object.freeze({ __proto__: null });
const kType = Symbol('type');
const kStats = Symbol('stats');
class Dirent {
  name: string;
  parentPath: string;
  path: string;
  constructor(name, type, path) {
    this.name = name;
    this.parentPath = path;
    this.path = path;
    this[kType] = type;
  }

  isDirectory() {
    return this[kType] === UV_DIRENT_DIR;
  }

  isFile() {
    return this[kType] === UV_DIRENT_FILE;
  }

  isBlockDevice() {
    return this[kType] === UV_DIRENT_BLOCK;
  }

  isCharacterDevice() {
    return this[kType] === UV_DIRENT_CHAR;
  }

  isSymbolicLink() {
    return this[kType] === UV_DIRENT_LINK;
  }

  isFIFO() {
    return this[kType] === UV_DIRENT_FIFO;
  }

  isSocket() {
    return this[kType] === UV_DIRENT_SOCKET;
  }
}

class DirentFromStats extends Dirent {
  constructor(name, stats, path) {
    super(name, null, path);
    this[kStats] = stats;
  }
}

const validateBoolean = (value: any, name: string) => {
  if (typeof value !== 'boolean') {
    throw new Error(`${name} must be a boolean, received ${typeof value}`);
  }
};

const assertEncoding = (encoding: string) => {
  if (encoding && !Buffer.isEncoding(encoding)) {
    const reason = 'is invalid encoding';
    throw new Error(`${encoding} ${reason}`);
  }
};
const validateAbortSignal = (signal: any, name: string) => {
  if (signal !== undefined &&
    (signal === null ||
      typeof signal !== 'object' ||
      !('aborted' in signal))) {
    throw new Error(`${name} is not AbortSignal`);
  }
};

function getOptions(options: any, defaultOptions: any = kEmptyObject) {
  if (options == null || typeof options === 'function') {
    return defaultOptions;
  }

  if (typeof options === 'string') {
    defaultOptions = { ...defaultOptions };
    defaultOptions.encoding = options;
    options = defaultOptions;
  } else if (typeof options !== 'object') {
    throw new Error(typeof options + ' is not an object');
  }

  if (options.encoding !== 'buffer')
    assertEncoding(options.encoding);

  if (options.signal !== undefined) {
    validateAbortSignal(options.signal, 'options.signal');
  }

  return options;
}

function validateFunction(value: any, name: string) {
  if (typeof value !== 'function')
    throw new Error(`${name} is notFunction`);
};

function getValidatedPath(path: string | Buffer | URL): string {
  if (typeof path === 'string') {
    return path;
  }
  if (Buffer.isBuffer(path)) {
    return path.toString();
  }
  if (path instanceof URL) {
    if (path.protocol !== 'file:') {
      throw new Error('URL protocol must be file:');
    }
    return path.pathname;
  }
  throw new Error('path must be a string, Buffer, or URL');
}

function getDirent(path: string, name: string, type: number,
  callback?: (err: Error | null, dirent?: Dirent | DirentFromStats) => void) {
  if (typeof callback === 'function') {
    if (type === UV_DIRENT_UNKNOWN) {
      let filepath;
      try {
        filepath = join(path, name);
      } catch (err) {
        callback(err as Error);
        return;
      }
      lazyLoadFs().lstat(filepath, (err, stats) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null, new DirentFromStats(name, stats, filepath));
      });
    } else {
      callback(null, new Dirent(name, type, path));
    }
  } else if (type === UV_DIRENT_UNKNOWN) {
    const filepath = join(path, name);
    const stats = lazyLoadFs().lstatSync(filepath);
    return new DirentFromStats(name, stats, path);
  } else {
    return new Dirent(name, type, path);
  }
}

function assignFunctionName(name: any, fn: any, descriptor = kEmptyObject) {
  if (typeof name !== 'string') {
    const symbolDescription = (name as symbol)?.description;
    assert(symbolDescription !== undefined, 'Attempted to name function after descriptionless Symbol');
    name = `[${symbolDescription}]`;
  }
  return Object.defineProperty(fn, 'name', {
    // @ts-ignore
    __proto__: null,
    writable: false,
    enumerable: false,
    configurable: true,
    ...Object.getOwnPropertyDescriptor(fn, 'name'),
    ...descriptor,
    value: name,
  });
}

export {
  getOptions,
  validateFunction,
  getValidatedPath,
  getDirent,
  validateBoolean,
  assignFunctionName,
};