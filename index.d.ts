export interface RegisterOptions {
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

export interface Register {
    /**
     * Register the asar archives with the given options.
     * @param options - The options for registering the asar archives.
     */
    (options: RegisterOptions): void;
}

export const enum FileType {
    kFile = 1,
    kDirectory = 2,
    kLink = 3,
}

export interface AsarFileStat {
    size: number;
    offset: number;
    type: FileType;
}

export interface AsarFileInfo {
    size: number;
    offset: number;
    unpacked: boolean;
    integrity?: {
        algorithm: 'SHA256';
        hash: string;
    }
}

export interface ArchiveBinding {
    getFileInfo(path: string): AsarFileInfo | false;
    stat(path: string): AsarFileStat | false;
    readdir(path: string): string[] | false;
    realpath(path: string): string | false;
    copyFileOut(path: string): string | false;
    getFdAndValidateIntegrityLater(): number | -1;
    readonly archivePath: string;
}

export interface GetOrCreateArchive {
    /**
     * Get or create an archive binding for the given archive path.
     */
    (archivePath: string): ArchiveBinding;
}

type LoadArchiveOptions = RegisterOptions;
export interface AsarArchives {
    /**
     * Load the asar archives with the given options.
     * @param options
     */
    loadArchives(options: LoadArchiveOptions): void;
    /**
     * Check if the given file is an asar archive.
     * @param archiveFile - The path to the archive file.
     */
    isArchive(archiveFile: string): boolean;
    /**
     * Resolve the archive mapping for the given file path.
     * This is used to resolve the mapping of the asar archive to the original file path.
     * If the file is not in an asar archive, it returns null.
     * @param filepath - The file path to resolve.
     */
    resolveArchiveMapping(filepath: string): string | null;
}

export declare const register: Register;
export declare const getOrCreateArchive: GetOrCreateArchive;
export declare const archives: AsarArchives;