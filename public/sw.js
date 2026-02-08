/// <reference lib="webworker" />
importScripts('/internal/init_config.js?ts=202602090305+0800');
// update ts if the external file is changed (in order to bust the cache); no need to update ts if sw.js itself changed

const global = (typeof globalThis !== 'undefined' && globalThis !== null) ? globalThis : (typeof self !== 'undefined' && self !== null) ? self : this;
const CACHE_NAME = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;

global.addEventListener('install', (event) => {
    global.console.log("[sw]", 'install');
    global.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {   
            return cache.addAll(appInitConfig.FILES_TO_CACHE_ON_STARTUP);
        }).catch(e => global.console.warn("[sw]", 'Failed to cache some resources:', e))
    );
});

global.addEventListener('activate', (event) => {
    global.console.log("[sw]", 'activate');
    event.waitUntil((async () => {
        await global.clients.claim();
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.filter((cacheName) => {
                return cacheName.startsWith(appInitConfig.CACHE_PREFIX) && cacheName !== CACHE_NAME;
            }).map((cacheName) => {
                return caches.delete(cacheName);
            })
        );
    })());
});

global.addEventListener('fetch', (/** @type {FetchEvent} */event) => {
    const req = event.request; let origin, pathname, hostname;
    try {
        ({origin, pathname, hostname} = new URL(req.url));
        if (origin !== global.location.origin) return; // not same origin, ignore
    } catch {
        return; // invalid url, ignore
    }
    const isSimple = req.method === 'GET' && !req.headers.has('range');
    // handle internal rewrites first
    for (const rewritePath of Reflect.ownKeys(rewriteMap)) {
        if (pathname === rewritePath) {
            const isHandled = rewriteMap[rewritePath](event, isSimple);
            if (isHandled) return;
        }
    }
    // check if it is a "simple" request
    if (!isSimple) return;
    // check if the domain is in the skip cache list
    if (appInitConfig.SKIP_CACHE_DOMAIN.includes(hostname)) return;
    // handle the request
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(req);
        if (cachedResponse) try {
            // check if the object is immutable
            const pathname = new URL(req.url).pathname;
            for (const i of appInitConfig.IMMUTABLE_CACHE_FILE_MATCH) {
                if (i.test(pathname)) {
                    // immutable cache file, return cached response directly
                    return cachedResponse;
                }
            }
            // check if we have internet connection
            if (!global.navigator.onLine) return cachedResponse;
            // not immutable, check the latest version first
            // try to get ETag, or Last-Modified header
            const etag = cachedResponse.headers.get('ETag');
            const lastModified = cachedResponse.headers.get('Last-Modified') || cachedResponse.headers.get('Date');
            const headers = new Headers(req.headers);
            if (etag) headers.set('If-None-Match', etag);
            else if (lastModified) headers.set('If-Modified-Since', lastModified);
            else {
                // no ETag or Last-Modified header, we should fallback to network
                const resp = await fetch(req);
                if (resp.ok) {
                    const clone = resp.clone(); // we must clone first, otherwise the body will be consumed
                    await cache.put(req, clone);
                }
                return resp;
            }
            // test the response status
            const resp = await fetch(req, { headers });
            if (resp.status === 304) {
                // not modified, return cached response
                return cachedResponse;
            } else if (resp.ok) {
                // modified, return new response
                const clone = resp.clone(); // clone first
                await cache.put(req, clone);
                return resp;
            } else {
                // other status
                return resp;
            }
        } catch {
            return cachedResponse; // fallback when failure, e.g., network error
        } // end `if (cachedResponse) try`
        // the request was not cached, fetch it from network
        // the following fetch might fail; this is expected
        // if the network is not working
        // instead of returning a fake response, we choose throw the error to the invoker
        const resp = await fetch(req);
        if (resp.ok) {
            const clone = resp.clone(); // clone first
            await cache.put(req, clone);
        }
        return resp;
    })());
});


/**
 * @type {Record<string, (event: FetchEvent, isSimple: boolean) => boolean>}
 */
var rewriteMap = {
    "/internal/w/running"(event, isSimple) {
        if (!isSimple) return false; // not simple request, ignore
        event.respondWith(Promise.resolve(new Response(new Blob(["true"], { type: "application/json" }))));
        return true; // rewrite done
    },
}

