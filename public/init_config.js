globalThis.appInitConfig = {
    CACHE_PREFIX: 'openchatworkbench_web_cache-',
    CACHE_VERSION: 1,
    IMMUTABLE_CACHE_FILE_MATCH: [
        /^\/assets\/([^/]+?)\.s\.[\w$]+$/,
        /^\/vendor\/npm\/([\w-]+?)@(\d+?\.\d+?\.\d+?)\//,
    ],
    FILES_TO_CACHE_ON_STARTUP: [
        '/',
    ],
    SKIP_CACHE_DOMAIN: [
        'localhost',
        '127.0.0.1',
    ],
}