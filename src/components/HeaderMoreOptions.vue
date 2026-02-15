<template>
    <a-dropdown :trigger="['click']">
        <template #overlay>
            <a-menu @click="handleMenuClick">
                <a-menu-item key="delete" style="color: var(--danger-color, #ff4d4f);" v-if="appState.page === 'chat'">
                    <DeleteOutlined />
                    Delete
                </a-menu-item>

                <a-menu-item key="settings">
                    <SettingOutlined />
                    Settings
                </a-menu-item>
            </a-menu>
        </template>
        <a-button shape="circle" type="text">
            <EllipsisOutlined />
        </a-button>
    </a-dropdown>
</template>

<script setup lang="ts">
import { DeleteOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons-vue';
import { useAppStateStore } from '@/stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { message, Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';

const appState = useAppStateStore();
const windowState = useWindowStateStore();
const appStatePersist = useAppStatePersistStore();

const router = useRouter();

const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
        case 'delete':
            // 确认删除？
            Modal.confirm({
                title: 'Delete Conversation',
                content: 'Are you sure you want to delete this conversation?',
                okText: 'Yes',
                okType: 'danger',
                cancelText: 'No',
                onOk: () => {
                    message.error('Not implemented yet');
                },
                onCancel: () => {},
            });
            break;

        case 'settings':
            router.push('/settings/');
            break;
    
        default:
            break;
    }
}
</script>

<style scoped>
</style>
