// Service Worker APIs

export async function registerServiceWorker() {
    if (Reflect.has(window.navigator, 'serviceWorker') && typeof window.navigator.serviceWorker.register === 'function') {
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
