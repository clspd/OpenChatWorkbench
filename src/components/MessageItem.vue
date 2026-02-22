<template>
    <div class="message-item-container">
        <template v-if="
    props.message.role === MessageRole.System ||
    props.message.role === MessageRole.User || 
    props.message.role === MessageRole.Assistant">
            <div class="message-item" :data-role="msgRoleIdentifyMap[props.message.role]">
                <div class="message-avatar">
                    <div class="message-avatar-icon" v-if="appStatePersist.showAvatar === 'default' || avatarUrl === 'N/A'">
                        <UserOutlined v-if="props.message.role === MessageRole.User" />
                        <RobotOutlined v-if="props.message.role === MessageRole.Assistant" />
                    </div>
                    <div class="message-avatar-icon" v-else-if="appStatePersist.showAvatar === 'custom'">
                        <img v-if="avatarUrl" :src="avatarUrl" :alt="props.message.role" />
                    </div>
                </div>

                <div class="message-body">
                    <MessageContentRenderer :message="props.message" :show-raw="props.showRaw" />
                </div>
            </div>
        </template>
        <div v-else class="err-unsupported-message">
            This message role is not supported.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { MessageRole, type Message } from '@/types/message';
import { msgRoleIdentifyMap, prettyMsgRole } from "@/modules/chat/msgRoleMap";
import MessageContentRenderer from './MessageContentRenderer.vue';
import { GetCustomAvatarUrl } from '@/utils/userCustomAvatar';

const appStatePersist = useAppStatePersistStore();

const props = defineProps<{
    message: Message;
    showRaw?: boolean;
}>();

const avatarUrl = ref('');
const msgRole2StorageRole: Record<string, string> = {
    [MessageRole.User]: 'user',
    [MessageRole.Assistant]: 'assistant',
    [MessageRole.System]: 'system',
}

onMounted(() => {
    if (appStatePersist.showAvatar === 'custom') {
        const role = msgRole2StorageRole[props.message.role];
        if (role) GetCustomAvatarUrl(role).then(url => avatarUrl.value = url).catch(() => avatarUrl.value = 'N/A');
    }
});

</script>

<style scoped>
.message-item {
    display: flex;
    flex-direction: column;
}
.message-item .message-avatar {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
}
.message-item[data-role="system"] {
    align-items: center;
}
.message-item[data-role="user"] {
    align-items: flex-end;
}
.message-item[data-role="user"] .message-avatar {
    text-align: right;
}

.message-avatar-icon > :deep(*) {
    padding: 5px;
    border-radius: 50%;
    aspect-ratio: 1;
    border: 1px solid gray;
    font-size: 2em;
}

.message-avatar-icon > img {
    width: 40px;
    height: 40px;
    padding: 0;
}

/* Message body:
show user message as bubble 
show assistant message as text
*/
.message-item[data-role="user"] > .message-body {
    padding: 0.5em;
    border-radius: 1em;
    background-color: #e0ebff;
}

</style>
