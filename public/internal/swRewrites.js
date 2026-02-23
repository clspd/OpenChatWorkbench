/// <reference lib="webworker" />

/** @type {any} */(self).RewriteMap =
/**
 * @type { { path: string | RegExp, handler: (event: FetchEvent, isSimple: boolean) => boolean }[] }
 */
[
    {
        path: "/internal/w/running",
        handler: (/** @type {FetchEvent} */ event, /** @type {boolean} */ isSimple) => {
            if (!isSimple) return false; // not simple request, ignore
            event.respondWith(new Response(new Blob(["true"], { type: "application/json" })));
            return true; // rewrite done
        },
    },
];
