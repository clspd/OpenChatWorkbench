/// <reference lib="webworker" />
const CONFIG_FILE = '/internal/init_config.js',
// update ts if the external file is changed (in order to bust the cache); no need to update ts if sw.js itself changed
    CONFIG_FILE_TS = '202602110345+0800',
    CONFIG_FILE_URL = CONFIG_FILE + '?ts=' + CONFIG_FILE_TS;
importScripts(CONFIG_FILE_URL);

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
    // check if the rewuester wants to ignore cache
    if (req.cache === 'no-store') return;
    // handle the request
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(req, { ignoreSearch: false, ignoreMethod: false, });
        if (cachedResponse) try {
            // check if the object is immutable
            const pathname = new URL(req.url).pathname;
            if (req.cache !== 'no-cache')
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
            } else if (resp.status >= 500 && resp.status <= 599) {
                // 5xx status, server error; fallback to cache
                return cachedResponse;
            } else {
                // other status
                return resp;
            }
        } catch {
            return cachedResponse; // fallback when failure, e.g., network error
        } // end `if (cachedResponse) try`
        // the request was not cached, fetch it from network
        if ((!global.navigator.onLine) && req.mode === 'navigate') { // fast fail
            return (await cache.match(new Request('/resource/offline@1.0.0.html'))) || new Response(new Blob([offlineNetworkErrorPage], { type: 'text/html' }));
        }
        try {
            const resp = await fetch(req);
            if (resp.ok) {
                const clone = resp.clone(); // clone first
                await cache.put(req, clone);
            }
            return resp;
        }
        catch (e) {
            if (req.mode === 'navigate') {
                return new Response(new Blob([failedNetworkErrorPageBuilder(String(e))], { type: 'text/html' }));
            }
            throw e; // this is expected
        }
    })());
});


/**
 * @type {Record<string, (event: FetchEvent, isSimple: boolean) => boolean>}
 */
var rewriteMap = {
    "/internal/w/running"(event, isSimple) {
        if (!isSimple) return false; // not simple request, ignore
        event.respondWith(new Response(new Blob(["true"], { type: "application/json" })));
        return true; // rewrite done
    },
    "/internal/init_config.js"(event, isSimple) {
        if (!isSimple) return false;
        try {
            const url = new URL(event.request.url);
            const ts = url.searchParams.get('ts');
            if (!ts) return false;
            event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request, { ignoreSearch: false }).then(resp => resp ?? fetch(event.request).then(resp => resp.ok ? (cache.put(event.request, resp.clone()).then(() => resp)) : resp))));
            return true;
        } catch { return false }
    },
};


var offlineNetworkErrorPage = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head><body><h1>You are offline</h1><p>The page you request couldn't be loaded because you are offline. Please connect to the Internet and reload the page.</p></body></html>`;
var failedNetworkErrorPageBuilder = (errMsg) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head><body><h1>Unable to access page</h1><p>The page you request couldn't be loaded because of an error. Please check your Internet connection and try again. If the error continues to occur, please check the browser console.</p><div>Technical information:</div><div style="font-family: Consolas, monospace; white-space: pre-wrap; word-break: break-all">${(errMsg.replace(/\u003c|\u003e/g, match => match === '\u003c' ? '&lt;' : '&gt;'))}</div></body></html>`;


