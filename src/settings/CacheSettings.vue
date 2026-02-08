<template>
    <div class="sub-settings-container">
        <h2>Cache Settings</h2>
        <p>
            The application can cache some frontend resources to improve performance and allow offline access.
            This page provides settings to manage the cache.
        </p>

        <a-card title="Cache Availability">
            <div>
                <b>Service Worker status:</b>
                <StatusText :value="isSwActive" activeText="Active" inactiveText="Not Active" />
            </div>

            <div>
                <b>Explaination:</b>
                <span>&nbsp;</span>
                <span v-if="isSwActive">
                    The Service Worker is active. It can cache frontend resources.
                </span>
                <span v-else>
                    The resources will not be cached because the Service Worker is not active. Service Worker
                    is a background script that runs in the browser. It can cache frontend resources and
                    serve them when the application is offline. If it is not active, the request will
                    go into the network directly, preventing the application from working offline.
                </span>
            </div>
            <div v-if="!isSwActive">
                <b>To fix this:</b>
                <ul>
                    <li>If this is the first time for you to use the application, <i>sit down and relax</i>. The service worker is supposed to be installing in the background. Try to wait for a while and <a href="javascript:" @click.prevent="checkSw(true)">check again</a>.</li>
                    <li>If you are browsing in <i>Private</i> mode (or Incognito mode), the Service Worker may not be supported or may be cleared when you close the window. Try using normal browsing mode instead.</li>
                    <li>Try refreshing the page. Sometimes the Service Worker needs a page reload to complete the installation process.</li>
                    <li>Check if your browser supports Service Workers. Most modern browsers (Chrome, Firefox, Safari, Edge) support Service Workers, but make sure you're using an updated version.</li>
                    <li>If you're using a corporate network or behind a firewall, check if Service Workers are being blocked. Some security settings may prevent Service Worker registration.</li>
                    <li>Disable any browser extensions that might interfere with Service Workers, such as ad blockers or privacy extensions, then reload the page.</li>
                </ul>
            </div>
        </a-card>

        <a-card title="Cached Resources">
            <div>
                <b>Brief</b>
                <span>:&nbsp;</span>
                <span>Currently {{cachedCount}} object{{cachedCount === 1 ? '' : 's'}} have been cached.</span>
            </div>
        </a-card>

        <a-card title="Cache Management" v-if="isSwActive">
            <div>
                <b>Actions</b>
                <span>:&nbsp;</span>
                <a-button @click="checkCacheStatus">Check Cache Status</a-button>
                <a-button @click="cacheAllResources">Cache All Resources</a-button>
                <a-button danger @click="clearCache">Clear Cache</a-button>
            </div>
        </a-card>

        <DialogView v-model="showCacheProgressDlg" :closable="false" style="white-space: pre;">
            <template #title>Download in progress</template>
            <div>Downloading <b>{{cacheDownloadStat.current}}</b> of <b>{{cacheDownloadStat.total}} objects</b></div>
            <div>Current: <b>{{cacheDownloadStat.currentName}}</b></div>
            <template #footer>
                <a-button type="primary" danger :disabled="!cacheDownloadStat.abortController" @click="cacheDownloadStat.abortController?.abort()">Cancel</a-button>
            </template>
        </DialogView>
    </div>
</template>

<script setup lang="ts">
import { isServiceWorkerActive } from '@/utils/swApi';
import { onMounted, ref } from 'vue';
import StatusText from '@/components/StatusText.vue'
import { message, Modal } from 'ant-design-vue';
import { DialogView } from 'vue-dialog-view';

const isSwActive = ref<boolean>(false);
const cachedCount = ref<number>(0);

onMounted(async () => {
    await checkSw();
    await checkCacheStatus();
})

const confirm = (title: string, content: string, okText: string = 'Yes', cancelText: string = 'No') => new Promise(resolve =>
    Modal.confirm({
        title,
        content,
        okText,
        cancelText,
        onOk: () => { resolve(true); },
        onCancel: () => { resolve(false); },
    })
);

const checkSw = async (showToast: boolean = false) => {
    isSwActive.value = await isServiceWorkerActive();
    if (showToast) message.info("We've checked the Service Worker status again.")
}
const checkCacheStatus = async () => {
    try {
        if (!isSwActive.value) return;
        const cacheName = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;
        if (!caches.has(cacheName)) return;
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cachedCount.value = keys.length;
    } catch (error) {
        message.error('Failed to check cache status: ' + error);
    }
}

const showCacheProgressDlg = ref(false);
const cacheDownloadStat = ref({
    current: 0,
    currentName: '',
    total: 0,
    abortController: undefined as AbortController | undefined,
});
const cacheAllResources = async () => {
    try {
        if (!isSwActive.value) return;

        const resp = await fetch(appInitConfig.MANIFEST_FILE);
        if (!resp.ok) throw new Error('Failed to fetch manifest file: HTTP ' + resp.status + ' ' + resp.statusText);
        const res = await resp.json();
        const urls = Object.values(res).map((item: any) => new URL(item.file, window.location.href));
        if (!await confirm('Are you sure cache all resources?', 'This action will download ' + urls.length + ' resources, which may take a while. Do you want to continue?')) return;
        const cacheName = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;
        const cache = await caches.open(cacheName);
        cacheDownloadStat.value.total = urls.length;
        showCacheProgressDlg.value = true;
        for (const url of urls) {
            ++cacheDownloadStat.value.current;
            try {
                cacheDownloadStat.value.abortController = new AbortController();
                const req = new Request(url), realReq = new Request(url, { signal: cacheDownloadStat.value.abortController.signal });
                cacheDownloadStat.value.currentName = url.pathname;
                const res = await fetch(realReq);
                if (!res.ok) throw new Error('Failed to fetch resource ' + url + ': HTTP ' + res.status + ' ' + res.statusText);
                await cache.put(req, res);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    message.info('Cache download canceled.');
                    return;
                }
                message.error('Failed to cache resource ' + url + ': ' + error);
                return;
            }
        }
        
        message.success('All resources have been cached.');
    } catch (error) {
        message.error('Failed to cache all resources: ' + error);
    } finally {
        showCacheProgressDlg.value = false;
        cacheDownloadStat.value.abortController = undefined;
    }
}

const clearCache = async () => {
    try {
        if (!isSwActive.value) return;
        if (!await confirm('Are you sure clear all cached resources?', 'This action will clear all cached resources. The next time you visit the application, all resources will be downloaded again, causing slower loading speed.')) return;
        const cacheName = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;
        if (!caches.has(cacheName)) { 
            message.info('No cache found.');
            return;
        }
        if (await caches.delete(cacheName))
            message.success('All cached resources have been cleared.');
        else
            message.error('Failed to clear cache. It might been already cleared.');
    } catch (error) {
        message.error('Failed to clear cache: ' + error);
    }
}
</script>

<style scoped>
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}
h2, p {
    margin-top: 0;
}
.status-text {
    margin-left: 0.5em;
}
.ant-btn + .ant-btn {
    margin-left: 0.5em;
}
</style>
