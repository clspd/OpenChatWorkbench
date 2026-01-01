<template>
    <template v-if="width > 640">
        <a-layout-sider :style="{ backgroundColor: '#f0f2f5', width: '200px' }" :collapsed="isCollapsed">
            <div ref="content"></div>
        </a-layout-sider>
    </template>
    <template v-else>
        <a-drawer :width="500" title="Basic Drawer" placement="left" :open="!isCollapsed" @close="isCollapsed = true">
            <template #extra>
                <a-button @click="isCollapsed = true">Collapse</a-button>
            </template>
            <div ref="content"></div>
        </a-drawer>
    </template>

    <teleport :to="content" v-if="content">
        <div>Side menu</div>
    </teleport>
</template>

<script setup lang="ts">
import { useWindowStateStore } from '@/stores/windowState';
import { ref } from 'vue'

const isCollapsed = ref(true)
const content = ref()

const { width } = useWindowStateStore()
</script>

<style scoped>
    
</style>
