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
    _resolveFilename(request: string, parent?: NodeJS.Module | null,
      isMain?: boolean, options?: { paths: string[] }): string;
    _preloadModules(requests: string[]): void;
    _nodeModulePaths(from: string): string[];
    _extensions: Record<string, (module: NodeJS.Module, filename: string) => any>;
    _cache: Record<string, NodeJS.Module>;
    wrapper: [string, string];
  }

  interface Module {
    _resolveLookupPaths(request: string, parent?: NodeJS.Module | null, newReturn?: string): string[];
    _findPath(request: string, paths: string[], isMain?: boolean): string | Buffer | boolean | false;
    _pathCache: Record<string, string>;
    _extensions: Record<string, (module: NodeJS.Module, filename: string) => any>;
  }
}