declare global {
    const appInitConfig: {
        /**
         * Prefix for cache keys used in the service worker
         */
        readonly CACHE_PREFIX: string;
        /**
         * Version number for the cache, increment to invalidate existing caches
         */
        readonly CACHE_VERSION: number;
        /**
         * Regular expressions to match files that should be cached immutably
         */
        readonly IMMUTABLE_CACHE_FILE_MATCH: RegExp[];
        /**
         * Regular expressions to match files that should always go to the network
         */
        readonly NEVER_CACHE_FILE_MATCH: RegExp[];
        /**
         * Files that should be cached when the service worker starts up
         */
        readonly FILES_TO_CACHE_ON_STARTUP: string[];
        /**
         * Path to the manifest.json file
         */
        readonly MANIFEST_FILE: string;
        /**
         * Domains where caching should be skipped (e.g., localhost)
         */
        readonly SKIP_CACHE_DOMAIN: string[];
    };
}

export {};