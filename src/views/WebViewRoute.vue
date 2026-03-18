<template>
    <DialogView class="webview-page" v-model="open">
        <template #title>
            <div class="titlebar">
                <div class="title-text">{{ title }}</div>
                <a-button type="text" @click="openInBlank"><FullscreenOutlined /></a-button>
            </div>
        </template>
        <WebViewCore
            autofocus
            class="webview"
            :content="contentUrl.href"
        />
    </DialogView>
</template>

<script setup lang="ts">
import { t } from 'i18next';
import { ref, computed, watch } from 'vue';
import { DialogView } from 'vue-dialog-view';
import WebViewCore from '@/components/WebViewCore.vue';
import { useRouter } from 'vue-router';
import { domain_name_main_root, webview_trusted_domains } from '@/config';
import { currentLanguageDisplaying } from '@/i18n';
import { hostname } from 'os';

const defaultTitle = t('common:ui.webview.title');

const props = withDefaults(defineProps<{
    url?: string;
    title?: string;
    navhide: boolean;
}>(), {
    url: '',
    title: '',
});

const contentUrl = computed(() => {
    const url = new URL('/webview.html?safe=1', window.location.href);
    url.searchParams.append('lang', currentLanguageDisplaying.value);
    url.hash = encodeURIComponent(props.url);
    let realOrigin: string, hn: string;
    try {
        const u = (new URL(props.url, location.href));
        realOrigin = u.origin; hn = u.hostname;
    } catch { realOrigin = 'null'; hn = ''; }
    return { origin: realOrigin, hostname: hn, href: url.href };
});

const isExternal = computed(() =>
    contentUrl.value.origin !== location.origin &&
    contentUrl.value.hostname !== domain_name_main_root &&
    (!webview_trusted_domains.some(v =>
        contentUrl.value.hostname.endsWith(v)
    ))
);

const title = computed(() => isExternal.value ? t('common:ui.webview.external.title') : (props.title || defaultTitle));

const router = useRouter();

const open = computed({
    get: () => !0,
    set(v) { 
        if ((window as any).navigation?.canGoBack) {
            history.back();
        } else { 
            router.push('/');
        }
    },
})

const openInBlank = () => window.open(props.url);


</script>

<style scoped>
.webview-page {
    width: 100%;
    height: 100%;
}
.titlebar {
    display: flex;
    align-items: center;
}
.title-text {
    flex: 1;
}
.webview {
    flex: 1;
}
</style>