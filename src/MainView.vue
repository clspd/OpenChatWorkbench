<template>
    <a-layout>
        <Sidebar></Sidebar>
        <a-layout>
            <router-view></router-view>
        </a-layout>
    </a-layout>
</template>

<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
    
</script>

<style scoped>
    
</style>
