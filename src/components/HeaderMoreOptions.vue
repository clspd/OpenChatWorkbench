<template>
    <a-dropdown :trigger="['click']">
        <template #overlay>
            <a-menu @click="handleMenuClick">
                <a-menu-item key="new_conv" v-if="appState.page !== 'new-chat'">
                    <PlusOutlined />
                    New Conversation
                </a-menu-item>

                <a-menu-item key="delete" style="color: var(--danger-color, #ff4d4f);" v-if="appState.page === 'chat'">
                    <DeleteOutlined />
                    Delete
                </a-menu-item>

                <a-menu-item key="settings" v-if="appState.page !== 'settings'">
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
import { handleRequestDeleteConversation } from '@/modules/ui-utils/convManager';

const appState = useAppStateStore();
const windowState = useWindowStateStore();
const appStatePersist = useAppStatePersistStore();

const router = useRouter();

const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
        case 'new_conv':
            router.push('/');
            break;

        case 'delete':
            if (appState.currentConversationId) {
                handleRequestDeleteConversation(appState.currentConversationId, true, router);
            }
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
