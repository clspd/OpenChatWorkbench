globalThis.Object.defineProperty(globalThis, "appInitConfig", { value: Object.freeze(
/** @type {AppInitConfig} */({
    CACHE_PREFIX: 'openchatworkbench_web_cache-',
    CACHE_VERSION: 3,
    IMMUTABLE_CACHE_FILE_MATCH: [
        /^\/assets\/.+\.s\.[\w$]+?$/,
        /^\/vendor\/npm\/([\w-]+?)@(\d+?\.\d+?\.\d+?)\//,
        /^\/resource\/([^\/]+?)@(\d+?\.\d+?\.\d+?)\.([\w$]+?)$/,
    ],
    NEVER_CACHE_FILE_MATCH: [],
    CACHE_BY_TS_QUERY_FILE_MATCH: [
        /^\/internal\/(init_config|swRewrites)\.js$/,
    ],
    FILES_TO_CACHE_ON_STARTUP: [
        '/',
        '/resource/offline@1.0.0.html',
    ],
    MANIFEST_FILE: '/internal/manifest.json',
    SKIP_CACHE_DOMAIN: [
        'localhost',
        '127.0.0.1',
    ],
    CROSS_ORIGIN_REQUEST_MODE: "bypass",
}
)), configurable: false, writable: false, enumerable: true });

/**
 * Mode for handling cross-origin requests
 * @typedef {"bypass" | "ignore" | "normal"} AppInitConfig_CrossOriginRequestMode
 * - **bypass**: Do not capture the request, let the browser handles it (default)
 * - **ignore**: Do not cache the response, but still capture the request
 * - **normal**: Cache the response just like same-origin requests
 */
/** @typedef {Object} AppInitConfig
 * @property {string} CACHE_PREFIX Prefix for cache keys used in the service worker
 * @property {number} CACHE_VERSION Version number for the cache, increment to invalidate existing caches
 * @property {RegExp[]} IMMUTABLE_CACHE_FILE_MATCH Regular expressions to match files that should be cached immutably
 * @property {RegExp[]} NEVER_CACHE_FILE_MATCH Regular expressions to match files that should always go to the network
 * @property {RegExp[]} CACHE_BY_TS_QUERY_FILE_MATCH Regular expressions to match files that should be cached immutably if `ts` query parameter is present
 * @property {string[]} FILES_TO_CACHE_ON_STARTUP Files that should be cached when the service worker starts up
 * @property {string} MANIFEST_FILE Path to the manifest.json file
 * @property {string[]} SKIP_CACHE_DOMAIN Domains where caching should be skipped (e.g., localhost)
 * @property {AppInitConfig_CrossOriginRequestMode?} CROSS_ORIGIN_REQUEST_MODE Mode for handling cross-origin requests (default: "bypass")
 */
