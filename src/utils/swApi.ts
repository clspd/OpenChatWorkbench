// Service Worker APIs
import { isFunctionalCookieConsented } from "./cookieConsent";

export async function registerServiceWorker() {
    if (Reflect.has(window.navigator, 'serviceWorker') && typeof window.navigator.serviceWorker.register === 'function') {
        if (!await isFunctionalCookieConsented()) {
            await Promise.all((await window.navigator.serviceWorker.getRegistrations()).map((reg) => reg.unregister()));
            const config = (globalThis as any).appInitConfig;
            await caches.delete(config.CACHE_PREFIX + config.CACHE_VERSION);
            return null;
        }
        return await window.navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
    }
    return null;
}

export async function isServiceWorkerActive() {
    try { 
        return await (await fetch('/internal/w/running')).json();
    }
    catch {
        return false;
    }
}
