<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import MainView from './MainView.vue'
import CookieConsent from './components/CookieConsent.vue'
import { useAppStateStore } from './stores/appState';
import { useAppStatePersistStore } from './stores/appStatePersist';

const ConfigGuide = defineAsyncComponent(() => import('@/settings/ConfigGuide.vue'))

const appState = useAppStateStore()
const appStatePersist = useAppStatePersistStore()
</script>

<template>
    <div class="app-main-app">
        <a-config-provider :theme="appStatePersist.theme">
            <main-view></main-view>
            <CookieConsent />
            <ConfigGuide v-if="appState.showConfigGuide" />
        </a-config-provider>
    </div>
</template>

<style scoped>
.app-main-app {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: auto;
}
</style>
