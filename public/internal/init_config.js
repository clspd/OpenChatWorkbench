globalThis.Object.defineProperty(globalThis, "appInitConfig", { value: Object.freeze(
{
    CACHE_PREFIX: 'openchatworkbench_web_cache-',
    CACHE_VERSION: 2,
    IMMUTABLE_CACHE_FILE_MATCH: [
        /^\/assets\/.+\.s\.[\w$]+?$/,
        /^\/vendor\/npm\/([\w-]+?)@(\d+?\.\d+?\.\d+?)\//,
        /^\/resource\/([^\/]+?)@(\d+?\.\d+?\.\d+?)\.([\w$]+?)$/,
    ],
    FILES_TO_CACHE_ON_STARTUP: [
        '/',
        '/resource/offline.html',
    ],
    MANIFEST_FILE: '/internal/manifest.json',
    SKIP_CACHE_DOMAIN: [
        'localhost',
        '127.0.0.1',
    ],
}
), configurable: false, writable: false, enumerable: true });
