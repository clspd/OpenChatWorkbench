<template>
    <a-layout class="main-layout">
        <Sidebar></Sidebar>
        <a-layout class="main-content">
            <a-layout-header class="main-content-header">
                <HeaderBar></HeaderBar>
            </a-layout-header>
            <router-view></router-view>
        </a-layout>
    </a-layout>
</template>

<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import HeaderBar from './components/HeaderBar.vue'
import { useWindowStateStore } from '@/stores/windowState';
import { useAppStateStore } from './stores/appState';

const windowState = useWindowStateStore();
const appState = useAppStateStore();
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
