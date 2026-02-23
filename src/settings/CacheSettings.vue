<template>
    <div class="sub-settings-container" v-if="isAvailable">
        <h2>{{ t('settings:cache.title') }}</h2>
        <p>
            {{ t('settings:cache.description') }}
        </p>

        <a-card :title="t('settings:cache.availability.title')">
            <div>
                <b>{{ t('settings:cache.availability.serviceWorkerStatus') }}</b>
                <StatusText :value="isSwActive" :activeText="t('settings:cache.availability.active')" :inactiveText="t('settings:cache.availability.notActive')" />
            </div>

            <div>
                <b>{{ t('settings:cache.availability.explanation') }}</b>
                <span>&nbsp;</span>
                <span v-if="isSwActive">
                    {{ t('settings:cache.availability.activeExplanation') }}
                </span>
                <span v-else>
                    {{ t('settings:cache.availability.inactiveExplanation') }}
                </span>
            </div>
            <div v-if="!isSwActive">
                <b>{{ t('settings:cache.availability.toFix') }}</b>
                <ul>
                    <li>{{ t('settings:cache.availability.fix1') }} <a href="javascript:" @click.prevent="checkSw(true)">{{ t('settings:cache.availability.fix1Check') }}</a>.</li>
                    <li>{{ t('settings:cache.availability.fix2') }}</li>
                    <li>{{ t('settings:cache.availability.fix3') }}</li>
                    <li>{{ t('settings:cache.availability.fix4') }}</li>
                    <li>{{ t('settings:cache.availability.fix5') }}</li>
                    <li>{{ t('settings:cache.availability.fix6') }}</li>
                </ul>
            </div>
        </a-card>

        <a-card :title="t('settings:cache.resources.title')">
            <div>
                <b>{{ t('settings:cache.resources.brief') }}</b>
                <span>{{ t('settings:cache.resources.cachedObjects', { count: cachedCount, plural: cachedCount === 1 ? '' : 's' }) }}</span>
            </div>
        </a-card>

        <a-card :title="t('settings:cache.management.title')" v-if="isSwActive">
            <div>
                <b>{{ t('settings:cache.management.actions') }}</b>
                <a-button @click="checkCacheStatus">{{ t('settings:cache.management.checkStatus') }}</a-button>
                <a-button @click="cacheAllResources">{{ t('settings:cache.management.cacheAll') }}</a-button>
                <a-button danger @click="clearCache">{{ t('settings:cache.management.clear') }}</a-button>
            </div>
        </a-card>

        <DialogView v-model="showCacheProgressDlg" :closable="false" style="white-space: pre;">
            <template #title>{{ t('settings:cache.progress.title') }}</template>
            <div>{{ t('settings:cache.progress.downloading', { current: cacheDownloadStat.current, total: cacheDownloadStat.total }) }}</div>
            <div>{{ t('settings:cache.progress.current') }} <b>{{cacheDownloadStat.currentName}}</b></div>
            <template #footer>
                <div style="text-align: right;">
                    <a-button type="primary" danger :disabled="!cacheDownloadStat.abortController" @click="cacheDownloadStat.abortController?.abort()">{{ t('settings:cache.progress.cancel') }}</a-button>
                </div>
            </template>
        </DialogView>
    </div>
    <div class="sub-settings-container" v-else>
        <h2>{{ t('settings:cache.title') }}</h2>
        <p>{{ t('settings:cache.messages.pageUnavailable') }} <a href="javascript:" @click.prevent="cookieConsent">{{ t('settings:cache.messages.changeCookieConsent') }}</a>.</p>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { isFunctionalCookieConsented } from '@/utils/cookieConsent';
import { isServiceWorkerActive } from '@/utils/swApi';
import StatusText from '@/components/StatusText.vue'
import { message, Modal } from 'ant-design-vue';
import { DialogView } from 'vue-dialog-view';
import { useAppStateStore } from '@/stores/appState';
import { t } from 'i18next';

const isAvailable = ref(true);
const isSwActive = ref<boolean>(false);
const cachedCount = ref<number>(0);
const appInitConfig = (globalThis as any).appInitConfig;

onMounted(async () => {
    useAppStateStore().setTitle('Cache Settings')

    isAvailable.value = await isFunctionalCookieConsented();
    await checkSw();
    await checkCacheStatus();
})

const cookieConsent = () => useAppStateStore().showCookieConsent = true;

const confirm = (title: string, content: string, okText: string = t('settings:cache.messages.yes'), cancelText: string = t('settings:cache.messages.no')) => new Promise(resolve =>
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
    if (showToast) message.info(t('settings:cache.messages.checkedSwStatus'))
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
        message.error(t('settings:cache.messages.failedToCheckCache', { error }))
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
        if (process.env.NODE_ENV === 'development') throw t('settings:cache.messages.notAvailableInDev');

        cacheDownloadStat.value.total = cacheDownloadStat.value.current = 0;
        cacheDownloadStat.value.abortController = undefined;
        cacheDownloadStat.value.currentName = t('settings:cache.messages.fetchingManifest');
        showCacheProgressDlg.value = true;
        const resp = await fetch(appInitConfig.MANIFEST_FILE);
        if (!resp.ok) throw new Error(t('settings:cache.messages.failedToFetchManifest', { status: resp.status, statusText: resp.statusText }));
        const res = await resp.json();
        const urls = Object.values(res).map((item: any) => new URL(item.file, window.location.href));
        showCacheProgressDlg.value = false;
        if (!await confirm(t('settings:cache.messages.confirmCacheAll'), t('settings:cache.messages.confirmCacheAllContent', { count: urls.length }))) return;
        showCacheProgressDlg.value = true;
        const cacheName = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;
        const cache = await caches.open(cacheName);
        cacheDownloadStat.value.total = urls.length;
        cacheDownloadStat.value.current = 0;
        for (const url of urls) {
            ++cacheDownloadStat.value.current;
            try {
                cacheDownloadStat.value.abortController = new AbortController();
                const req = new Request(url), realReq = new Request(url, {
                    signal: cacheDownloadStat.value.abortController.signal,
                    cache: 'no-cache',
                });
                cacheDownloadStat.value.currentName = url.pathname;
                const res = await fetch(realReq);
                if (!res.ok) throw new Error(t('settings:cache.messages.failedToFetchResource', { url, status: res.status, statusText: res.statusText }));
                await cache.put(req, res);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    message.info(t('settings:cache.messages.cacheDownloadCanceled'));
                    return;
                }
                message.error(t('settings:cache.messages.failedToCacheResource', { url, error }));
                return;
            }
        }
        
        message.success(t('settings:cache.messages.allResourcesCached'));
    } catch (error) {
        message.error(t('settings:cache.messages.failedToCacheAll', { error }));
    } finally {
        showCacheProgressDlg.value = false;
        cacheDownloadStat.value.abortController = undefined;
    }
}

const clearCache = async () => {
    try {
        if (!isSwActive.value) return;
        if (!await confirm(t('settings:cache.messages.confirmClearCache'), t('settings:cache.messages.confirmClearCacheContent'))) return;
        const cacheName = appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION;
        if (!caches.has(cacheName)) { 
            message.info(t('settings:cache.messages.noCacheFound'));
            return;
        }
        if (await caches.delete(cacheName))
            message.success(t('settings:cache.messages.allCacheCleared'));
        else
            message.error(t('settings:cache.messages.failedToClearCache'));
    } catch (error) {
        message.error(t('settings:cache.messages.failedToClearCacheError', { error }));
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
