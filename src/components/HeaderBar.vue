<template>
    <div class="header-bar">
        <template v-if="windowState.isLargeScreen">
            <!-- 大屏幕显示对话标题和对话设置按钮 -->
        </template>
        <template v-else>
            <!-- 小屏幕显示（常驻）菜单展开按钮和新建对话按钮 -->
            <a-button shape="circle" type="text" @click="appState.sidebarCollapsed = !appState.sidebarCollapsed">
                <CaretRightFilled />
            </a-button>
            <div class="flexible-space"></div>
            <a-button shape="circle" type="text" @click="newChat">
                <PlusCircleOutlined />
            </a-button>
            <!-- 对话设置按钮 -->
            <a-button shape="circle" type="text">
                <EllipsisOutlined />
            </a-button>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import { useRouter } from 'vue-router';

const appState = useAppStateStore();
const windowState = useWindowStateStore();

const router = useRouter();

const newChat = () => {
    router.push('/chat')
}
</script>

<style scoped>
.header-bar {
    display: flex;
    align-items: center;
    padding: 10px;
}
</style>
