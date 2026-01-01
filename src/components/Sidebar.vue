<template>
    <template v-if="windowState.isLargeScreen">
        <a-layout-sider class="a-sider" :style="{ backgroundColor: 'var(--layout-sider-bg)' }" :width="250" :collapsedWidth="0" :collapsed="appState.sidebarCollapsed">
            <div class="sidebar-header">
                <div style="display: flex; align-items: center;">
                    <AppLogo :size="16" />
                </div>
                <div class="flexible-space"></div>
                <a-button type="text" shape="circle" @click="appState.sidebarCollapsed = !appState.sidebarCollapsed">
                    <CaretLeftFilled />
                </a-button>
            </div>
            <div ref="content" class="sidebar-content-container"></div>
        </a-layout-sider>
    </template>
    <template v-else>
        <a-drawer
            class="a-drawer"
            :width="Math.min(windowState.width, 250)"
            :closable="false"
            :headerStyle="{ padding: '0.5em 1em', border: '0' }"
            :bodyStyle="{ padding: 0, display: 'flex', flexDirection: 'column' }"
            placement="left"
            :open="!appState.sidebarCollapsed"
            @close="appState.sidebarCollapsed = true"
        >
            <template #title>
                <div style="display: flex; align-items: center;">
                    <AppLogo :size="16" />
                </div>
            </template>
            <template #extra>
                <a-button type="text" shape="circle" @click="appState.sidebarCollapsed = !appState.sidebarCollapsed">
                    <CaretLeftFilled />
                </a-button>
            </template>
            <div ref="content" class="sidebar-content-container"></div>
        </a-drawer>
    </template>

    <teleport :to="content" v-if="content">
        <div class="sidebar-content">
            <div class="row" style="padding: 0 0.5em;">
                <a-button type="dashed" @click="newChat">New Chat</a-button>
            </div>
            <div class="message-list-container">
                <MessageList />
            </div>
            <div class="user-and-settings">
                <div class="row"><a-button type="text" @click="goSettings">Settings</a-button></div>
                <div class="row"><a-button type="text" @click="goAbout">About</a-button></div>
            </div>
        </div>
    </teleport>

    <div class="s-tl-extra" v-if="windowState.isLargeScreen && appState.sidebarCollapsed">
        <AppLogo :size="16" />
        <div class="btn-group">
            <!-- 浮动的“展开”按钮（桌面端） -->
            <a-button
                type="text"
                shape="circle"
                @click="appState.sidebarCollapsed = !appState.sidebarCollapsed"
            >
                <CaretRightFilled />
            </a-button>
            <!-- 新对话（桌面端） -->
            <a-button type="text" shape="circle" @click="newChat">
                <PlusCircleOutlined />
            </a-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import { onMounted, ref } from 'vue'
import AppLogo from './AppLogo.vue'
import { useRouter } from 'vue-router';

const content = ref()
const router = useRouter()

const appState = useAppStateStore()
const windowState = useWindowStateStore()

onMounted(() => {
    appState.sidebarCollapsed = windowState.isLargeScreen ? false : true
})

const newChat = () => {
    router.push('/chat')
}
const goSettings = () => {
    router.push('/settings/')
}
const goAbout = () => {
    router.push('/about/')
}
</script>

<style scoped>
.sidebar-header {
    display: flex;
    align-items: center;
    padding: 0.5em 1em;
}
.a-sider :deep(.ant-layout-sider-children) {
    display: flex;
    flex-direction: column;
}
.sidebar-content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
}
.message-list-container {
    flex: 1;
}
.user-and-settings {
    margin-top: 0.5em;
    border-top: 1px solid var(--split-border-color);
    padding: 10px;
}
.row {
    display: flex;
    flex-direction: column;
}
.row+.row {
    margin-top: 0.5em;
}
.s-tl-extra {
    position: absolute;
    top: 0;
    left: 0;
    margin: 1em;
    z-index: 1;
    display: flex;
    align-items: center;
}
.s-tl-extra > * + * {
    margin-left: 1em;
}
.s-tl-extra > .btn-group {
    border: 1px solid var(--split-border-color);
    border-radius: 100px;
    padding: 2px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 100px;
    background: var(--background);
}
</style>
