declare const BUILDFLAG: (flag: boolean) => boolean;

declare namespace NodeJS {
  interface Process {
    noAsar?: boolean;
    binding(name: 'fs'): any;
    binding(name: 'modules'): any;
    helperExecPath?: string;
    resourcesPath?: string;
  }

  interface ModuleInternal extends NodeJS.Module {
    new(id: string, parent?: NodeJS.Module | null): NodeJS.Module;
    _load(request: string, parent?: NodeJS.Module | null, isMain?: boolean): any;
    _nodeModulePaths(from: string): string[];
    _cache: Record<string, NodeJS.Module>;
    _stat: (filename: string) => number;
    _readPackage: (pkgfile: string) => any;
  }

  interface Module {
    _resolveLookupPaths(request: string, parent?: NodeJS.Module | null, newReturn?: string): string[];
    _findPath(request: string, paths: string[], isMain?: boolean): string | false;
    _pathCache: Record<string, string>;
    _extensions: Record<string, (module: NodeJS.Module, filename: string) => any>;
  }
}