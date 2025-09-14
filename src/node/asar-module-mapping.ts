/**
 * modified from https://github.com/toyobayashi/asar-node
 */
import { archives, asarRe } from './archives';
import path from 'path';
import { setRealpathMappingEnabled } from './internal';

function getOptionValue(optionName: string) {
  return process.execArgv.includes(optionName) || !!(process.env.NODE_OPTIONS?.includes(optionName));
}

const preserveSymbolLinks = getOptionValue('--preserve-symlinks');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function wrapModuleAsarMapping(Module: NodeJS.ModuleInternal, asarFS: typeof import('fs')) {
  const isAsarDisabled = archives._isAsarDisabled;

  const readJsonFile = (filename: string) => {
    if (!asarFS.existsSync(filename)) return [];
    let str: string;
    try {
      str = asarFS.readFileSync(filename, 'utf8');
    }
    catch {
      return [];
    }
    return [str, str.length > 0];
  };

  const jsonReaderCache = new Map();
  const packageJsonReader = {
    read(jsonPath: string) {
      if (jsonReaderCache.has(jsonPath)) {
        return jsonReaderCache.get(jsonPath);
      }
      const { 0: string, 1: containsKeys } = readJsonFile(
        path.toNamespacedPath(jsonPath)
      );
      const result = { string, containsKeys };
      jsonReaderCache.set(jsonPath, result);
      return result;
    }
  };

  const pkgJsonCache = new Map();
  const readPackage = (requestPath: string) => {
    const jsonPath = path.resolve(requestPath, 'package.json');
    const existing = pkgJsonCache.get(jsonPath);
    if (existing !== undefined) return existing;
    const result = packageJsonReader.read(jsonPath);
    const json = result.containsKeys === false ? '{}' : result.string;
    if (json === undefined) {
      pkgJsonCache.set(jsonPath, false);
      return false;
    }
    try {
      const parsed = JSON.parse(json);
      const filtered = {
        exists: true,
        name: parsed.name,
        main: parsed.main,
        exports: parsed.exports,
        imports: parsed.imports,
        type: parsed.type || 'none',
      };
      pkgJsonCache.set(jsonPath, filtered);
      return filtered;
    }
    catch {
      const filtered = {
        exists: false,
        type: 'none',
      };
      pkgJsonCache.set(jsonPath, filtered);
    }
  };


  const nativeReadPackage = Module._readPackage;
  Module._readPackage = function (pkgPath: string) {
    if (asarRe.test(pkgPath)) {
      return readPackage(pkgPath);
    }
    const pkg = nativeReadPackage.call(this, pkgPath);
    if (pkg.exists || isAsarDisabled) {
      return pkg;
    }
    const resolvedPath = archives.resolveArchiveMapping(pkgPath);
    if (resolvedPath) {
      return readPackage(resolvedPath);
    }
    return pkg;
  };

  const statCache: Map<string, number> = new Map();
  const asarStat = function stat(filename: string) {
    filename = path.toNamespacedPath(filename);
    const result = statCache.get(filename);
    if (result !== undefined) { return result }

    const newResult = process.binding('fs').internalModuleStat(filename);
    if (newResult >= 0) {
      // Only set cache when `internalModuleStat(filename)` succeeds.
      statCache.set(filename, newResult);
    }
    return newResult;
  };

  const nativeStat = Module._stat;
  // stat mapping app/index.js => app.asar/index.js
  Module._stat = function (filename: string): number {
    if (isAsarDisabled) {
      return nativeStat.call(this, filename);
    }
    if (asarRe.test(filename)) {
      const result = asarStat.call(this, filename);
      if (result < 0) {
        return asarStat(filename.replace(/\.asar(?=\/|\\)/i, ''));
      }
      return result;
    }
    else {
      const result = asarStat(filename);
      if (result < 0) {
        const resolvedPath = archives.resolveArchiveMapping(filename);
        if (resolvedPath) {
          return asarStat(resolvedPath);
        }
      }
      return result;
    }
  };

  const nativeFindPath = Module._findPath;
  Module._findPath = function (request: string, paths: string[], isMain?: boolean): string | false {
    if (isAsarDisabled) {
      return nativeFindPath.call(this, request, paths, isMain);
    }

    let filename: string | false = false;
    if (preserveSymbolLinks) {
      filename = nativeFindPath.call(this, request, paths, isMain);
    }
    else {
      // When preserveSymbolLinks is false, we need to enable realpath mapping
      setRealpathMappingEnabled(true);
      try {
        filename = nativeFindPath.call(this, request, paths, isMain);
      }
      finally {
        setRealpathMappingEnabled(false);
      }
    }

    if (filename) {
      // file exists in native file system, asar files or native files
      if (statCache.has(filename)) {
        return filename;
      }
      else {
        // app.asar/index.js requires app/xxx.js
        if (asarRe.test(filename)) {
          return filename.replace(/\.asar(?=\/|\\)/i, '');
        }
        // app/index.js requires app.asar/xxx.js
        else {
          const resolvedPath = archives.resolveArchiveMapping(filename);
          if (resolvedPath) {
            return resolvedPath;
          }
        }
      }
    }
    return filename;
  };
};