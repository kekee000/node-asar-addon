/* eslint-disable @typescript-eslint/no-require-imports */
// Initialize ASAR support in fs module.
import {archives} from './archives';
import { wrapFsWithAsar } from './asar-fs-wrapper';
import { wrapModuleAsarMapping } from './asar-module-mapping';
import type { LoadArchiveOptions } from './archives';

export const isAsarDisabled = (): boolean => !!(process.noAsar || process.env.ELECTRON_NO_ASAR);

export function register(options: LoadArchiveOptions) {
  archives._isAsarDisabled = isAsarDisabled();
  archives.loadArchives(options);
  const fs = wrapFsWithAsar(require('fs'));
  wrapModuleAsarMapping(require('module') as NodeJS.ModuleInternal, fs as typeof import('fs'));
}

