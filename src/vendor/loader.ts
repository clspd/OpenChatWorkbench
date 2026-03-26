import { h } from "vue";
import { types } from 'mime-types';
import { Modal } from "ant-design-vue";
import { CloseCircleFilled } from "@ant-design/icons-vue";
import { db } from "@/userdata";
import { isServiceWorkerActive } from "@/utils/swApi";
import { extractTgz } from "@/utils/compress";
import { createProgressNotification } from "@/utils/progressNotification";
import { t } from "i18next";

export const VendorLoaderVersion = '1.0.0';

const LoadMap = new Map<string, Promise<any>>();

export function LoadVendor(libName: string, ver: string, tarballList: string[], cdnList: string[], isCritical: boolean, mainModule: string, cssFile?: { path: string; result?: string; }): Promise<any> {
    const id = libName + '@' + ver;
    const cached = LoadMap.get(id);
    if (cached) return cached;
    const _module = _LoadVendor(libName, ver, tarballList, cdnList, isCritical, mainModule, cssFile);
    LoadMap.set(id, _module);
    return _module;
}

async function _LoadVendor(libName: string, ver: string, tarballList: string[], cdnList: string[], isCritical: boolean, mainModule: string, cssFile?: { path: string; result?: string; }): Promise<any> {
    let progress: ReturnType<typeof createProgressNotification> | undefined = undefined;;
    if (await isServiceWorkerActive()) try {
        const prefix = '/vendor/npm/' + libName + '@' + ver + '/';
        const downloaded = (await db.get('cache', 'npm:downloaded_lib_version:' + libName));
        if (downloaded === (ver + '_' + VendorLoaderVersion)) try {
            if (cssFile) {
                const path = prefix + cssFile.path;
                const css = await fetch(path);
                if (!css.ok) throw css.status
                cssFile.result = processCSS(await css.text(), path);
            }
            console.debug('[vendor]', '[loader]', 'use cached package:', libName + '@' + ver, VendorLoaderVersion);
            return await importModule(prefix + mainModule);
        } catch {
            // maybe cache was cleared by user, ignore error
        }
        console.debug('[vendor]', '[loader]', 'downloading package:', libName + '@' + ver, 'previous:', downloaded);

        // download & add to cache
        progress = createProgressNotification(
            t('common:loader.downloading.title'),
            t('common:loader.downloading.desc', { pkg: libName }),
            0, 100, 20
        );
        
        const tgz = new Blob([await Promise.any(
            tarballList.map(url => fetch(url).then(res => {
                if (!res.ok) throw new Error(`Tarball download failed: ${res.status}`);
                return res.arrayBuffer();
            }))
        )]);

        progress.update(100);

        const files = await extractTgz(tgz);
        const c = (window as any).appInitConfig;
        const cache = await caches.open(c.CACHE_PREFIX + c.CACHE_VERSION);
        const PACKAGE = 'package/'; const PACKAGE_LEN = PACKAGE.length;
        for (const [name, content] of files) {
            const url = new URL(prefix + name.substring(PACKAGE_LEN), window.location.href);
            const resp = new Response(content as Uint8Array<ArrayBuffer>, {
                status: 200,
                headers: {
                    'cross-origin-resource-policy': 'cross-origin',
                    'access-control-allow-origin': '*',
                    'content-length': String(content.byteLength),
                    'content-type': types['.' + name.replace(/^.*\./, '').toLowerCase()] || 'application/octet-stream',
                }
            })
            await cache.put(url, resp);
        }
        await db.put('cache', ver + '_' + VendorLoaderVersion, 'npm:downloaded_lib_version:' + libName);
        if (cssFile) {
            const path = prefix + cssFile.path;
            const raw = files.get(cssFile.path);
            if (!raw) throw new Error(`Missing file in tarball: ${cssFile.path}`)
            cssFile.result = processCSS(new TextDecoder().decode(raw), path);
        }
        return await importModule(prefix + mainModule);
    } finally { if (progress) progress.close() }

    try {
        const cdnUrls = cdnList.map(template =>
            template.replace(/\{(p|v)\}/g, (match, p1) => ({ p: libName, v: ver } as any)[p1])
        );

        progress = createProgressNotification(
            t('common:loader.downloading.title'),
            t('common:loader.downloading.desc', { pkg: libName }),
            -1, cdnUrls.length + 1, -1
        );

        let current = -1;
        for (const baseUrl of cdnUrls) try {
            progress.update(++current);
            console.debug('[vendor]', '[loader]', 'downloading package:', libName + '@' + ver, 'from:' + current);

            let css: string | null = null;
            if (cssFile) {
                const cssUrl = baseUrl + cssFile.path;
                const cssResp = await fetch(cssUrl);
                if (!cssResp.ok) throw new Error(`CSS load failed: ${cssResp.status}`);
                css = processCSS(await cssResp.text(), cssUrl);
            }

            const mainUrl = baseUrl + mainModule;
            progress.close();
            const module = await importModule(mainUrl);
            if (cssFile && css) cssFile.result = css;
            return module;
        } catch {}

        throw new Error('all cdn failed');
    } catch (e) {
        if (progress) progress.close();
        (isCritical ? Modal.error : Modal.confirm)({
            title: 'Failed to load ' + libName + '@' + ver,
            content: isCritical ? 'The application will not work.' : 'Some part of the application might not work.',
            icon: h(CloseCircleFilled, { style: { color: '#ff4d4f' } }),
            okText: "Try again",
            onOk: () => (location.reload(), new Promise(() => { })),
            cancelText: 'Ignore',
        });
        throw e;
    }
}

function processCSS(cssText: string, cssFilePath: string) { 
    const base = new URL('./', new URL(cssFilePath, window.location.href));
    return cssText.replace(/url\(\s*("|')?([^"')]+)\1\s*\)/gi, (m, quote, url) => {
        return 'url(' + (quote || '') + (new URL(url, base)).href + (quote || '') + ')'
    })
}
