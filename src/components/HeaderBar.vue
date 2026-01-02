<template>
    <div class="header-bar">
        <template v-if="windowState.isLargeScreen">
            <!-- 大屏幕显示对话标题和对话设置按钮 -->
            <div class="s-tl-extra" :style="{ visibility: appState.sidebarCollapsed ? 'visible' : 'hidden' }">
                <AppLogo :size="16" />
                <div class="btn-group">
                    <!-- 浮动的“展开”按钮（桌面端） -->
                    <a-button type="text" shape="circle"
                        @click="appState.sidebarCollapsed = !appState.sidebarCollapsed">
                        <CaretRightFilled />
                    </a-button>
                    <!-- 新对话（桌面端） -->
                    <a-button type="text" shape="circle" @click="newChat">
                        <PlusCircleOutlined />
                    </a-button>
                </div>
            </div>

            <template v-if="appState.page === 'chat'">
                <div class="flexible-space"></div>
                <div class="title"></div>
                <div class="flexible-space"></div>
                <a-button shape="circle" type="text" @click="newChat">
                    <PlusCircleOutlined />
                </a-button>
                <!-- 对话设置按钮 -->
                <a-dropdown :trigger="['click']">
                    <template #overlay>
                        <a-menu @click="handleMenuClick">
                            <a-menu-item key="delete" style="color: var(--danger-color, #ff4d4f);">
                                <DeleteOutlined />
                                Delete
                            </a-menu-item>
                        </a-menu>
                    </template>
                    <a-button shape="circle" type="text">
                        <EllipsisOutlined />
                    </a-button>
                </a-dropdown>
            </template>
            <div v-else class="flexible-space title-text">{{ appState.title }}</div>
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
import { message } from 'ant-design-vue';
import confirm from 'ant-design-vue/es/modal/confirm';
import { useRouter } from 'vue-router';

const appState = useAppStateStore();
const windowState = useWindowStateStore();

const router = useRouter();

const newChat = () => {
    router.push('/chat')
}

const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'delete') {
        // 确认删除？
        confirm({
            title: 'Are you sure delete this conversation?',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            
            onOk: () => {
                message.error('Not implemented yet');
            },
            onCancel: () => {},
        });
    }
}
</script>

<style scoped>
.header-bar {
    display: flex;
    align-items: center;
    padding: 10px;
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
.title-text {
    font-weight: bold;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    text-align: center;
}
</style>
