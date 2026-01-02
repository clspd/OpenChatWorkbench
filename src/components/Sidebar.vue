<template>
    <template v-if="windowState.isLargeScreen">
        <a-layout-sider class="a-sider sidebar-container" :style="{ backgroundColor: 'var(--layout-sider-bg)' }" :width="250" :collapsedWidth="0" :collapsed="appState.sidebarCollapsed">
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
            class="a-drawer sidebar-container"
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
            <div class="message-list-container" @scroll.passive="handleConvListScroll" ref="convListContainer">
                <ConversationList @initialized="restoreScrollPos" />
            </div>
            <div class="user-and-settings">
                <div class="row"><a-button type="text" @click="goSettings">
                    <SettingOutlined />
                    <span>Settings</span>
                </a-button></div>
            </div>
        </div>
    </teleport>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import { useAppStateSessionStore } from '@/stores/appStateSession';
import { onMounted, ref, watch } from 'vue'
import AppLogo from './AppLogo.vue'
import { useRouter } from 'vue-router';

const content = ref()
const router = useRouter()

const appState = useAppStateStore()
const windowState = useWindowStateStore()
const appStateSession = useAppStateSessionStore()

const convListContainer = ref<HTMLDivElement>()

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

const handleConvListScroll = (e: Event) => {
    if (appState.sidebarCollapsed) {
        return
    }
    const target = e.target as HTMLElement
    appStateSession.conversationListScrollPos = target.scrollTop
}

watch(() => appStateSession.conversationListScrollPos, (newVal, oldVal) => {
    restoreScrollPos()
})

watch(() => appState.sidebarCollapsed, (newVal, oldVal) => {
    if (!newVal) setTimeout(() => restoreScrollPos(), 200);
})

const restoreScrollPos = () => {
    if (convListContainer.value) {
        convListContainer.value.scrollTop = appStateSession.conversationListScrollPos
    }
}
</script>

<style scoped>
.sidebar-header {
    display: flex;
    align-items: center;
    padding: 0.5em 1em;
}
.sidebar-container {
    user-select: none;
}
.a-sider :deep(.ant-layout-sider-children) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.sidebar-content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.message-list-container {
    flex: 1;
    overflow: auto;
    margin-top: 0.5em;
}
.message-list-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
.message-list-container::-webkit-scrollbar-track {
    background-color: var(--scrollbar-track-color);
}
.message-list-container::-webkit-scrollbar-thumb {
    background-color: var(--scrollbar-thumb-color);
    border-radius: 4px;
}
.message-list-container::-webkit-scrollbar-thumb:hover {
    background-color: var(--scrollbar-thumb-hover-color);
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

</style>
