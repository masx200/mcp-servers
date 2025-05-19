declare class CacheStorage {
    private get cachePath();
    private getPathByKey;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
export declare const cacheStorage: CacheStorage;
export {};
