<script setup lang="ts">
import MainView from './MainView.vue'
import CookieConsent from './components/CookieConsent.vue'
</script>

<template>
    <div class="app-main-app">
        <main-view></main-view>
        <CookieConsent />
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
