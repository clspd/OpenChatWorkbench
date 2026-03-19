import { isServiceWorkerActive } from "./swApi";

export async function ForceDiscardCache() {
    document.cookie = `sys.operation.clearCache=yes; path=/; max-age=3600; secure`;

    if (await isServiceWorkerActive()) {
        const c = (window as any).appInitConfig;
        const cache = await caches.open(c.CACHE_PREFIX + c.CACHE_VERSION);
        const u = new URL("/", window.location.href);
        await cache.delete(u, { ignoreSearch: true });
        const newResp = await fetch(u, { cache: 'no-store' });
        await cache.put(u, newResp);
    }
    else {
        for (let i = 0; i < 2; i++) {
            document.cookie = `sys.operation.clearCache=yes; path=/; max-age=3600; secure`;
            await (await fetch(location.href, { cache: 'no-store' })).arrayBuffer();
        }
    }
}

