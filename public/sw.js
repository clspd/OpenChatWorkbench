/**
 * Generic Service Worker implementation
MIT License, Copyright (c) 2026 [@chcs1013](https://github.com/chcs1013)
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/// <reference lib="webworker" />
// @ts-ignore
const /** @type {ServiceWorkerGlobalScope & typeof globalThis} */global = (typeof globalThis !== 'undefined' && globalThis !== null) ? globalThis : (typeof self !== 'undefined' && self !== null) ? self : (() => { throw new Error('Unable to locate global object') })();

/** CONFIG REGION START */
// Add or edit your own configuration here

// update ts if the external file is changed (in order to bust the cache);
// no need to update ts if sw.js itself changed
const CONFIG_FILE = '/internal/init_config.js';
const CONFIG_FILE_TS = '202603250422+0800';
const REWRITES_FILE = '/internal/swRewrites.js';
const REWRITES_FILE_TS = '202602161150+0800';
const OFFLINE_PAGE_FILE = '/resource/offline@1.0.0.html';
/** @typedef {import('./internal/init_config.js').AppInitConfig} AppInitConfig */ // You may need to edit this if you renamed or moved the init_config.js file

/** CONFIG REGION END */

// sw code start
const CONFIG_FILE_URL = CONFIG_FILE + '?ts=' + CONFIG_FILE_TS;
const REWRITES_FILE_URL = REWRITES_FILE + '?ts=' + REWRITES_FILE_TS;
const REMOVE_CACHE_STAT = [0, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 26, 28, 31, 51];

importScripts(CONFIG_FILE_URL);
importScripts(REWRITES_FILE_URL);

const /** @type {AppInitConfig} */ appInitConfig = (/** @type {any} */(global)).appInitConfig;
const CACHE_NAME = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;

const /** @type {Record<string, string>} */HTML_SANITIZER_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', }, HTML_SANITIZER = new RegExp('[' + Object.keys(HTML_SANITIZER_MAP).join('') + ']', 'ig');
const /** @type {(t: any) => string} */sanitizeHtml = t => ((t = String(t)), t.replace(HTML_SANITIZER, (/** @type {string} */match) => HTML_SANITIZER_MAP[match]));

/** @typedef {{ path: string | RegExp, handler: (event: FetchEvent, isSimple: boolean) => boolean }} RewriteRule */
/** @type {RewriteRule[]} */ const RewriteMap = (/** @type {any} */(global)).RewriteMap;

global.addEventListener('install', (/** @type {ExtendableEvent} */event) => {
    global.console.log("[sw]", 'install');
    global.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {   
            return cache.addAll(appInitConfig.FILES_TO_CACHE_ON_STARTUP);
        }).catch(e => global.console.warn("[sw]", 'Failed to cache some resources:', e))
    );
});

global.addEventListener('activate', (/** @type {ExtendableEvent} */event) => {
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
    const req = event.request;
    let origin, pathname, hostname, /** @type {URLSearchParams} */searchParams, isSameOrigin = false;
    try {
        ({ origin, pathname, hostname, searchParams } = new URL(req.url));
        isSameOrigin = (origin === global.location.origin);
        if ((!isSameOrigin) && (appInitConfig.CROSS_ORIGIN_REQUEST_MODE !== 'ignore' && appInitConfig.CROSS_ORIGIN_REQUEST_MODE !== 'normal')) return; // not same origin, bypass
    } catch {
        return; // invalid url, ignore
    }
    const isSimple = req.method === 'GET' && !req.headers.has('range');
    // handle internal rewrites first
    for (const rule of RewriteMap) {
        if (rule.path) {
            if (typeof rule.path === 'string') {
                if (rule.path === pathname) {
                    if (rule.handler(event, isSimple)) return;
                }
            } else if (rule.path instanceof RegExp) {
                if (rule.path.test(pathname)) {
                    if (rule.handler(event, isSimple)) return;
                }
            }
        }
        // extendable: can add more match rules here...
    }
    // check if it is a "simple" request
    if (!isSimple) return;
    // check if the requester wants to ignore cache
    for (const i of appInitConfig.NEVER_CACHE_FILE_MATCH)
        if (i.test(pathname)) return; // return directly to go to the network
    const shouldIgnoreCache = ((!isSameOrigin) && (appInitConfig.CROSS_ORIGIN_REQUEST_MODE === 'ignore')) || appInitConfig.SKIP_CACHE_DOMAIN.includes(hostname);
    if (req.cache === 'no-store') return;
    // handle the request
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        // check if the domain is in the skip cache list
        const cachedResponse = (shouldIgnoreCache) ?
            null : await cache.match(req, { ignoreSearch: false, ignoreMethod: false, });
        if (cachedResponse) try {
            // check if the object is immutable
            const pathname = new URL(req.url).pathname;
            if (req.cache !== 'no-cache') {
                for (const i of appInitConfig.IMMUTABLE_CACHE_FILE_MATCH) {
                    // immutable cache file, return cached response directly
                    if (i.test(pathname)) return cachedResponse;
                }
                if (searchParams.has('ts')) for (const i of appInitConfig.CACHE_BY_TS_QUERY_FILE_MATCH) {
                    // immutable cache file by ts argument
                    // since we've already used `ignoreSearch: false`, the ts argument has been included in the cache,
                    // so the matched file's ts is the same as the request's
                    if (i.test(pathname)) return cachedResponse;
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
            if ((!etag && !lastModified)) {
                // no ETag or Last-Modified header, 
                // we should fallback to network
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
            } else if (resp.status >= 400 && resp.status <= 499) {
                // 4xx status, client error
                if (REMOVE_CACHE_STAT.includes(resp.status - 400)) // remove the cache
                    await cache.delete(req);
                return resp;
            } else {
                // other status
                return resp;
            }
        } catch {
            return cachedResponse; // fallback when failure, e.g., network error
        } // end `if (cachedResponse) try`
        // the request was not cached, fetch it from network
        if ((!global.navigator.onLine) && req.mode === 'navigate') { // fast fail
            return (await cache.match(new Request(OFFLINE_PAGE_FILE))) || new Response(new Blob([offlineNetworkErrorPage], { type: 'text/html' }));
        }
        try {
            const resp = await fetch(req);
            if (resp.ok && (!shouldIgnoreCache)) {
                const clone = resp.clone(); // clone first
                await cache.put(req, clone);
            }
            return resp;
        }
        catch (/** @type {any} */e) {
            if (req.mode === 'navigate') {
                return new Response(new Blob([failedNetworkErrorPageBuilder(String(e ? (e.stack ? (String(e) + '\n' + e.stack) : e) : e))], { type: 'text/html' }));
            }
            throw e; // this is expected
        }
    })());
});


var offlineNetworkErrorPage = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head><body><h1>You are offline</h1><p>The page you request couldn't be loaded because you are offline. Please connect to the Internet and reload the page.</p></body></html>`;
var failedNetworkErrorPageBuilder = (/** @type {string} */ errMsg) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Error</title></head><body><h1>Unable to access page</h1><p>The requested page couldn't be loaded because of an error. Please check your Internet connection and try again. If the error continues to occur, please check the browser console.</p><div>Technical information:</div><div style="font-family: Consolas, monospace; white-space: pre-wrap; word-break: break-all">${sanitizeHtml(errMsg)}</div></body></html>`;


