<template>
    <a-layout class="main-layout">
        <Sidebar></Sidebar>
        <a-layout class="main-content" :ref="(el: Component | null) => appState.mainContentViewEl = el">
            <a-layout-header class="main-content-header">
                <HeaderBar></HeaderBar>
            </a-layout-header>
            <router-view v-slot="{ Component }">
                <keep-alive :include="keepAliveName" :exclude="keepAliveExcludeName">
                    <component :is="Component" />
                </keep-alive>
            </router-view>
        </a-layout>
    </a-layout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, type Component } from 'vue';
import { useRouter } from 'vue-router';
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppStateStore } from './stores/appState';
import { DetectAndPromptLanguage } from './i18n/detector';

const router = useRouter();
const appState = useAppStateStore();
const keepAliveName = ref<string | undefined>();
const keepAliveExcludeName = ref(['WebViewRoute']);

onMounted(() => {
    DetectAndPromptLanguage();
})

router.afterEach((to, from) => {
    if (to.name === 'webview') {
        const cn = (from.meta.componentName) as string | undefined;
        console.debug('[MainView]', 'Keep alive component:', cn);
        keepAliveName.value = cn;
    }
    else keepAliveName.value = undefined;
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
