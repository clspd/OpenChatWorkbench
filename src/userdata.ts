import { app_name_id } from './config';
import type { IDBPDatabase, IDBPTransaction } from 'idb';

// config
export const db_name = app_name_id + '_data'
export const version = 2;


import { openDB, unwrap } from 'idb';


const el_dbExpired = globalThis.document?.createElement('dialog');
if (globalThis.document) {
    el_dbExpired.innerHTML = `
<div style="font-weight: bold; font-size: large;">The database has expired.</div>
<div style="font-size: smaller; color: gray; font-family: monospace;" data-content></div>
<div>
    <span>Please</span>
    <a href="javascript:" onclick="globalThis.location.reload()">reload the page</a>
    <span>to continue.</span>
</div>
`;
    el_dbExpired.oncancel = () => false;
    (document.body || document.documentElement).append(el_dbExpired);
}


interface UpgradeFunction {
    (db: IDBPDatabase, transaction: IDBPTransaction, oldVersion: number): void;
}

const dbUpgrade: Record<number, UpgradeFunction> = {
    0(db, t, old) {
        db.createObjectStore('config');
        db.createObjectStore('files');
        db.createObjectStore('tmp');
        db.createObjectStore('cache');
    },
    1(db, t, old) {
        db.createObjectStore('kv'); // key-value store
    },
};


/**@type {import('idb').IDBPDatabase} */
let db!: import('idb').IDBPDatabase;
await new Promise<void>(function (resolve, reject) {
    openDB(db_name, version, {
        // @ts-ignore
        upgrade(db: IDBPDatabase, oldVersion: number, newVersion: number | null, transaction: IDBPTransaction, event: IDBVersionChangeEvent) {
            if (newVersion === null) newVersion = 1;
            for (let version = oldVersion; version < newVersion; ++version) {
                if (dbUpgrade[version]) {
                    // @ts-ignore
                    const _ = dbUpgrade[version].call(db, db, transaction, oldVersion);
                }
            }
        },
        blocked(currentVersion, blockedVersion, event) {
            reject(`Failed to open database ${db_name}: blocked: currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`)
        },
        blocking(currentVersion, blockedVersion, event) {
            db.close();
            // @ts-ignore
            (el_dbExpired.querySelector('[data-content]') || {}).innerText = `currentVersion = ${currentVersion}, blockedVersion = ${blockedVersion}`;
            el_dbExpired.showModal();
        },
        terminated() {
            // …
        },
    })
    .then(function (result) {
        db = result;
        resolve();
    })
    .catch(reject);
    
    setTimeout(() => reject('Timeout while opening idb'), 10000);
});






export { db };





// ZenFS
import { configure } from '@zenfs/core';
import { IndexedDB, WebAccess } from '@zenfs/dom';


const __Factory = {
    open(name: string, ver: number) {
        let onsuccess: null | ((this: any, event: Event) => void) = null;
        const wrapped = new Proxy(unwrap(db), {
            get(db_target, prop, receiver) {
                if (prop === 'name') return 'files';
                const r = Reflect.get(db_target, prop, receiver);
                if (typeof r === 'function') return new Proxy(r, {
                    apply(target, __unused, argumentsList) {
                        return Reflect.apply(target, db_target, argumentsList);
                    },
                });
                return r;
            },
        });

        return {
            get onsuccess() { return onsuccess; },
            set onsuccess(value) { onsuccess = value; queueMicrotask(() => onsuccess?.call(this, new Event('success'))); },
            get onerror() { return null; },
            set onerror(value) { /* ignore */ },
            get onupgradeneeded() { return null; },
            set onupgradeneeded(value) { /* ignore */ },
            get onblocked() { return null; },
            set onblocked(value) { /* ignore */ },
            get result() { return wrapped; },
        };
    },
};
const fakeIDBFactory = new Proxy(Object.create(IDBFactory.prototype), {
    get(target, prop, receiver) {
        if (Reflect.has(__Factory, prop)) return Reflect.get(__Factory, prop);
        return Reflect.get(target, prop, receiver);
    },
});


await configure({
    disableAccessChecks: true,
    mounts: {
        '/': await IndexedDB.create({
            storeName: "files",
            idbFactory: fakeIDBFactory,
        }),
    },
});

export * as fs from '@zenfs/core/promises';
