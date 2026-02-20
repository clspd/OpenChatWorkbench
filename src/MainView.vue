<template>
    <a-layout class="main-layout">
        <Sidebar></Sidebar>
        <a-layout class="main-content" :ref="(el: Component | null) => appState.mainContentViewEl = el">
            <a-layout-header class="main-content-header">
                <HeaderBar></HeaderBar>
            </a-layout-header>
            <router-view></router-view>
        </a-layout>
    </a-layout>
</template>

<script setup lang="ts">
import type { Component } from 'vue';
import HeaderBar from './components/HeaderBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useAppStateStore } from './stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import '@/utils/webcIPCMessage'

const appState = useAppStateStore();
const windowState = useWindowStateStore();
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
