<template>
    <a-layout class="main-layout app-main-view_main-layout">
        <Sidebar></Sidebar>
        <a-layout class="main-content app-main-view_main-content app-scroll-container" :ref="(el: Component | null) => appState.mainContentViewEl = el">
            <a-layout-header class="main-content-header">
                <HeaderBar></HeaderBar>
            </a-layout-header>
            <router-view v-slot="{ Component }">
                <keep-alive :include="keepAliveNameComputed" :exclude="keepAliveExcludeName">
                    <component :is="Component" />
                </keep-alive>
            </router-view>
        </a-layout>
    </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppStateStore } from './stores/appState';
import { DetectAndPromptLanguage } from './i18n/detector';

const router = useRouter();
const appState = useAppStateStore();
const keepAliveName = ref(new Set<string>());
const keepAliveExcludeName = ref(['WebViewRoute']);
const keepAliveNameComputed = computed(() => (Array.from(keepAliveName.value)));

onMounted(() => {
    DetectAndPromptLanguage();
})

router.beforeEach((to, from, next) => {
    if (to.name === 'webview') {
        const cn = (from.meta.keepAliveComponentName) as string | undefined;
        if (cn) keepAliveName.value.add(cn);
        else keepAliveName.value.clear();
        console.debug('[MainView]', 'Keep alive component:', keepAliveNameComputed.value);
    }
    else if (to.meta.keepAliveComponentName) {
        keepAliveName.value.add(to.meta.keepAliveComponentName as string);
    }
    else keepAliveName.value.clear();
    nextTick(() => next());
});

</script>

<style scoped>
.main-content {
    overflow: auto;
}
.main-content-header {
    padding: 0;
    height: auto;
    line-height: 1em;
    background-color: var(--layout-header-bg);
    position: sticky;
    top: 0;
    left: 0;
    z-index: 1;
}
</style>
