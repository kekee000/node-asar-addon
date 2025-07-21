/**
 * modified from https://github.com/toyobayashi/asar-node
 */

import path from 'path';
const toNamespacedPath = path.toNamespacedPath;
import type { Module as ModuleType } from 'node:module';
import { isAsarDisabled, splitPath } from './archives';

let options: Map<string, any> | null = null;

function getOptionValue(optionName: string) {
  // const options = getOptionsFromBinding()
  if (!options) {
    options = new Map();
    for (let i = 0; i < process.argv.length; ++i) {
      const arg = process.argv[i];
      if (arg.startsWith('--')) {
        if (arg.startsWith('--no-')) {
          options.set('--' + arg.slice(5), { value: false });
        } else {
          const kv = arg.split('=');
          options.set(kv[0], { value: kv[1] === undefined ? true : kv[1] });
        }
      }
    }
  }
  if (optionName.startsWith('--no-')) {
    const option = options.get('--' + optionName.slice(5));
    return option && !option.value;
  }
  const v = options.get(optionName);
  return v != null ? v.value : undefined;
}

const preserveSymlinks = getOptionValue('--preserve-symlinks');
const preserveSymlinksMain = getOptionValue('--preserve-symlinks-main');
const CHAR_FORWARD_SLASH = 47;
const packageJsonCache = new Map();
const trailingSlashRegex = /(?:^|\/)\.?\.$/;

export function wrapModuleWithAsar(Module: NodeJS.ModuleInternal, fs: typeof import('fs')) {

  const tryRedirectUnpacked = (filepath: string): string => {
    const dir = path.dirname(filepath);
    const dirInfo = splitPath(dir);
    if (dirInfo.isAsar) {
      return path.join(dirInfo.asarPath + '.unpacked', dirInfo.filePath, path.basename(filepath));
    }
    else {
      return filepath;
    }
  };

  const redirectUnpackedPath = (filename: string) => {
    if (filename.endsWith('.node') || filename.endsWith('.asar')) {
      filename = tryRedirectUnpacked(filename);
    }
    return filename;
  };

  const internalModuleStat = (filename: string) => {
    try {
      return fs.statSync(filename).isDirectory() ? 1 : 0;
    } catch {
      return -1;
    }
  };

  const statCache: Map<string, any> = new Map();
  const stat = (filename: string) => {
    filename = path.toNamespacedPath(filename);
    if (statCache !== null) {
      const result = statCache.get(filename);
      if (result !== undefined) return result;
    }
    const result = internalModuleStat(filename);
    if (statCache !== null && result >= 0) {
      // Only set cache when `internalModuleStat(filename)` succeeds.
      statCache.set(filename, result);
    }
    return result;
  };

  const tryFile = (requestPath: string, isMain?: boolean) => {
    const rc = stat(requestPath);
    if (rc !== 0) return;
    if (preserveSymlinks && !isMain) {
      return path.resolve(requestPath);
    }
    return fs.realpathSync(requestPath);
  };

  function tryExtensions(p: string, exts: string[], isMain?: boolean) {
    for (let i = 0; i < exts.length; i++) {
      const filename = tryFile(p + exts[i], isMain);
      if (filename) {
        return filename;
      }
    }
    return;
  }

  const internalModuleReadJSON = (filename: string) => {
    if (!fs.existsSync(filename)) return [];
    let str: string;
    try {
      str = fs.readFileSync(filename, 'utf8');
    } catch {
      return [];
    }
    return [str, str.length > 0];
  };

  const cache = new Map();
  const packageJsonReader = {
    read(jsonPath) {
      if (cache.has(jsonPath)) {
        return cache.get(jsonPath);
      }

      const { 0: string, 1: containsKeys } = internalModuleReadJSON(
        toNamespacedPath(jsonPath)
      );
      const result = { string, containsKeys };
      cache.set(jsonPath, result);
      return result;
    }
  };

  const readPackage = (requestPath: string) => {
    const jsonPath = path.resolve(requestPath, 'package.json');

    const existing = packageJsonCache.get(jsonPath);
    if (existing !== undefined) return existing;

    const result = packageJsonReader.read(jsonPath);
    const json = result.containsKeys === false ? '{}' : result.string;
    if (json === undefined) {
      packageJsonCache.set(jsonPath, false);
      return false;
    }

    try {
      const parsed = JSON.parse(json);
      const filtered = {
        name: parsed.name,
        main: parsed.main,
        exports: parsed.exports,
        imports: parsed.imports,
        type: parsed.type
      };
      packageJsonCache.set(jsonPath, filtered);
      return filtered;
    } catch (e) {
      (e as any).path = jsonPath;
      (e as Error).message = 'Error parsing ' + jsonPath + ': ' + (e as Error).message;
      throw e;
    }
  };

  function tryPackage(requestPath: string, exts: string[], isMain?: boolean, originalPath?: string) {
    const tmp = readPackage(requestPath);
    const pkg = tmp != null ? tmp.main : undefined;
    if (!pkg) {
      return tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
    }

    const filename = path.resolve(requestPath, pkg);
    let actual = tryFile(filename, isMain) ||
      tryExtensions(filename, exts, isMain) ||
      tryExtensions(path.resolve(filename, 'index'), exts, isMain);
    if (actual === undefined) {
      actual = tryExtensions(path.resolve(requestPath, 'index'), exts, isMain);
      if (!actual) {
        const err = new Error(
          `Cannot find module '${filename}'. ` +
          'Please verify that the package.json has a valid "main" entry'
        );
        (err as any).code = 'MODULE_NOT_FOUND';
        (err as any).path = path.resolve(requestPath, 'package.json');
        (err as any).requestPath = originalPath;
        throw err;
      }
      else {
        const jsonPath = path.resolve(requestPath, 'package.json');
        process.emitWarning(
          `Invalid 'main' field in '${jsonPath}' of '${pkg}'. ` +
          'Please either fix that or report it to the module author',
          'DeprecationWarning',
          'DEP0128'
        );
      }
    }
    return actual;
  }

  function _findPath(this: ModuleType, request, paths, isMain) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const Module = this;
    const absoluteRequest = path.isAbsolute(request);
    if (absoluteRequest) {
      paths = [''];
    } else if (!paths || paths.length === 0) {
      return false;
    }

    const cacheKey = request + '\x00' + paths.join('\x00');
    const entry = Module._pathCache[cacheKey];
    if (entry) { return entry }

    let exts: string[] | undefined = undefined;
    let trailingSlash = request.length > 0 && request[request.length - 1] === CHAR_FORWARD_SLASH;
    if (!trailingSlash) {
      trailingSlash = trailingSlashRegex.test(request);
    }

    // For each path
    for (let i = 0; i < paths.length; i++) {
      // Don't search further if path doesn't exist
      const curPath = paths[i];
      if (curPath && stat(curPath) < 1 && !curPath.endsWith('.asar')) continue;

      const basePath = path.resolve(curPath, request);
      let filename: string | undefined = undefined;
      const rc = stat(basePath);
      if (!trailingSlash) {
        if (rc === 0) { // File.
          if (!isMain) {
            if (preserveSymlinks) {
              filename = path.resolve(basePath);
            } else {
              filename = fs.realpathSync(basePath);
            }
          } else if (preserveSymlinksMain) {
            // For the main module, we use the preserveSymlinksMain flag instead
            // mainly for backward compatibility, as the preserveSymlinks flag
            // historically has not applied to the main module.  Most likely this
            // was intended to keep .bin/ binaries working, as following those
            // symlinks is usually required for the imports in the corresponding
            // files to resolve; that said, in some use cases following symlinks
            // causes bigger problems which is why the preserveSymlinksMain option
            // is needed.
            filename = path.resolve(basePath);
          } else {
            filename = fs.realpathSync(basePath);
          }
        }

        if (!filename) {
          // Try it with each of the extensions
          if (exts === undefined) { exts = Object.keys(Module._extensions) }
          filename = tryExtensions(basePath, exts, isMain);
        }
      }

      if (!filename && rc === 1) { // Directory.
        // try it with each of the extensions at "index"
        if (exts === undefined) { exts = Object.keys(Module._extensions) }
        filename = tryPackage(basePath, exts, isMain, request);
      }

      while (filename && filename.endsWith('.asar')) {
        if (exts === undefined) { exts = Object.keys(Module._extensions) }
        filename = redirectUnpackedPath(filename);
        filename = tryPackage(filename, exts, isMain, request);
      }

      if (filename) {
        filename = redirectUnpackedPath(filename);
        Module._pathCache[cacheKey] = filename;
        return filename;
      }
    }

    return false;
  }

  const resolveAsar = (filename: string, request: string, isMain?: boolean, cacheKey?: string) => {
    let filenameInAsar: string | undefined = filename;
    while (filenameInAsar.endsWith('.asar')) {
      filenameInAsar = redirectUnpackedPath(filenameInAsar);
      filenameInAsar = tryPackage(filenameInAsar, Object.keys(Module._extensions), isMain, request);
      if (!filenameInAsar) return false;
    }
    filenameInAsar = redirectUnpackedPath(filenameInAsar);
    if (cacheKey) Module._pathCache[cacheKey] = filenameInAsar;
    return filenameInAsar;
  };

  const oldFindPath = Module._findPath;
  Module._findPath = function (request, paths, isMain) {
    const officialFileResult = oldFindPath.call(this, request, paths, isMain);
    if (isAsarDisabled()) return officialFileResult;
    if (officialFileResult) {
      const cacheKey = request + '\x00' + (paths ? Array.prototype.join.call(paths, '\x00') : '');
      return resolveAsar(officialFileResult as string, request, isMain, cacheKey);
    }
    return _findPath.call(Module, request, paths, isMain);
  };
}