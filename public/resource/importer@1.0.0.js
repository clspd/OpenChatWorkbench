globalThis.importModule = (/** @type {string} */ url) => import(url);
globalThis.importModuleEx = (/** @type {string} */ url, /** @type {any} */ options) => import(url, options);