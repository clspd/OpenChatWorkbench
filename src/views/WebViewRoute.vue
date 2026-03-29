<template>
    <DialogView class="webview-page" v-model="open" :closable="false" :show-title-bar="isExternal || !navhide" :data-navhide="!(isExternal || !navhide)">
        <template #title>
            <div class="titlebar">
                <a-button class="btn" type="text" @click="goBack"><ArrowLeftOutlined /></a-button>
                <div class="title-text">{{ title }}</div>
                <a-button class="btn" type="text" @click="openInBlank"><FullscreenOutlined /></a-button>
                <a-button class="btn" type="text" @click="close"><CloseOutlined /></a-button>
            </div>
        </template>
        <WebViewCore
            v-if="!isolated"
            autofocus
            class="webview"
            :content="contentUrl.href"
        />
        <div class="error-isolated" v-else>
            <div class="icon center" style="font-size: 3em;">
                <WarningTwoTone two-tone-color="orange" />
            </div>
            <div class="info center bold xl mg05ab">{{ t('common:ui.webview.isolated.title') }}</div>
            <div class="info center">{{ t('common:ui.webview.isolated.desc') }}</div>
            <div class="operations">
                <a-button type="primary" autofocus @click="openModeSwitcher = true">{{ t('common:ui.webview.isolated.switchMode') }}</a-button>
                <a-button @click="openInBlank">{{ t('common:ui.webview.isolated.openBlank') }}</a-button>
            </div>
        </div>
        <WorkingModeSwitcher v-model:open="openModeSwitcher" />
    </DialogView>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent, onMounted } from 'vue';
import { DialogView } from 'vue-dialog-view';
import { useRouter } from 'vue-router';
import { t } from 'i18next';
import { currentLanguageDisplaying } from '@/i18n';
import { previousPage } from '@/router';
import { useAppStateStore } from '@/stores/appState';
import { checkUrlIsExternal } from '@/utils/externalUrl';
import WebViewCore from '@/components/WebViewCore.vue';
const WorkingModeSwitcher = defineAsyncComponent(() => import('@/components/WorkingModeSwitcher.vue'));

const defaultTitle = t('common:ui.webview.title');
const appState = useAppStateStore();

const props = withDefaults(defineProps<{
    url?: string;
    title?: string;
    navhide?: boolean;
    ignoreIsolation?: boolean;
}>(), {
    url: '',
    title: '',
    navhide: false,
    ignoreIsolation: false,
});

const fromPage = previousPage;
const historyLengthWhenLoad = ref(0);

const contentUrl = computed(() => {
    const url = new URL('/webview.html?safe=1', window.location.href);
    url.searchParams.append('lang', currentLanguageDisplaying.value);
    url.hash = encodeURIComponent(props.url);
    let realOrigin: string, hn: string;
    try {
        const u = (new URL(props.url, location.href));
        if (props.ignoreIsolation) {
            if (checkUrlIsExternal(u) === false) return { origin: u.origin, hostname: u.hostname, href: u.href };
        }
        realOrigin = u.origin; hn = u.hostname;
    } catch { realOrigin = 'null'; hn = ''; }
    return { origin: realOrigin, hostname: hn, href: url.href };
});

const isExternal = computed(() => checkUrlIsExternal(contentUrl.value));

const title = computed(() => isExternal.value ? t('common:ui.webview.external.title') : (props.title || defaultTitle));
const updateTitle = () => appState.setTitle(title.value, false, true);

onMounted(() => {
    updateTitle();
    historyLengthWhenLoad.value = window.history.length;
});

watch(() => contentUrl.value, () => updateTitle());

const isolated = computed(() => !!window.crossOriginIsolated && (!props.ignoreIsolation || !isExternal));

const router = useRouter();

const goBack = () => { 
    if ((window as any).navigation?.canGoBack) {
        history.back();
    } else {
        router.replace('/'); // user wants to 'back', don't shock the user
    }
}

const open = ref(true);

const openInBlank = () => window.open(props.url);

const close = () => {
    // check history length first
    if (window.history.length === historyLengthWhenLoad.value) {
        window.history.back();
        return;
    }
    // if history length mismatch, it indicates that the user has navigated within
    // the iframe. In this case just use history.back() cannot close the dialog, 
    // which confuses the user, so we directly push the route
    if (fromPage) router.push(fromPage);
    else router.push('/');
}

const openModeSwitcher = ref(false);


</script>

<style scoped>
.webview-page {
    width: 100%;
    height: 100%;
}
.titlebar {
    display: flex;
    align-items: center;
    gap: 0.5em;
}
.title-text {
    flex: 1;
}
.webview {
    flex: 1;
}
.btn {
    padding: 0 5px;
}
.shadow-btn {
    pointer-events: none;
    opacity: 0;
}
.error-isolated {
    display: flex;
    flex-direction: column;
    margin: auto;
    max-width: 500px;
}
.center {
    text-align: center;
}
.mg05ab {
    margin: 0.5em 0;
}
.mg05t {
    margin-top: 0.5em;
}
.mg05b {
    margin-bottom: 0.5em;
}
.operations {
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 1em;
}
.webview-page[data-navhide="true"] {
    --dialog-padding: 0;
}
</style>