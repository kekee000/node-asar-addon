// Initialize ASAR support in fs module.
import archives, {isAsarDisabled} from './archives';
import path from 'path';
import { wrapFsWithAsar } from './asar-fs-wrapper';
import {wrapModuleWithAsar} from './asar-module-wrapper';
import type { ForkOptions } from 'child_process';

export function register(options: { archives: string[] }) {
  archives.loadArchives(options.archives);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = wrapFsWithAsar(require('fs'));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  wrapModuleWithAsar(require('module') as NodeJS.ModuleInternal, fs as typeof import('fs'));

  // Hook child_process.fork.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cp = require('child_process') as typeof import('child_process');
  const originalFork = cp.fork;
  cp.fork = (modulePath, args?, options?: ForkOptions) => {
    // Parse optional args.
    if (args == null) {
      args = [];
    } else if (typeof args === 'object' && !Array.isArray(args)) {
      options = args as ForkOptions;
      args = [];
    }
    // Fallback to original fork to report arg type errors.
    if (typeof modulePath !== 'string' || !Array.isArray(args) ||
        (typeof options !== 'object' && typeof options !== 'undefined')) {
      return originalFork(modulePath, args, options);
    }
    // When forking a child script, we setup a special environment to make
    // the electron binary run like upstream Node.js.
    options = options ?? {};
    options.env = Object.create(options.env || process.env);
    options.env!.ELECTRON_RUN_AS_NODE = '1';
    // On mac the child script runs in helper executable.
    if (!options.execPath && process.platform === 'darwin') {
      options.execPath = process.helperExecPath;
    }
    return originalFork(modulePath, args, options);
  };
}


export function addAsarToLookupPaths() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require('module') as NodeJS.ModuleInternal;

  if (Module && typeof Module._resolveLookupPaths === 'function') {
    const resolvePaths = function resolvePaths (paths: string[]) {
      if (isAsarDisabled()) return paths;
      for (let i = 0; i < paths.length; i++) {
        if (path.basename(paths[i]) === 'node_modules' && archives.isLookup(paths[i])) {
          paths.splice(i + 1, 0, paths[i] + '.asar');
          i++;
        }
      }
      return paths;
    };
    const oldResolveLookupPaths = Module._resolveLookupPaths;
    Module._resolveLookupPaths = function (this: typeof Module, request, parent) {
      const result = oldResolveLookupPaths.call(this, request, parent);
      if (!result) return result;
      return resolvePaths(result);
    };
  }

}

