<template>
    <div class="message-item-container">
        <template v-if="
    props.message.role === MessageRole.System ||
    props.message.role === MessageRole.User || 
    props.message.role === MessageRole.Assistant">
            <div class="message-item" :data-role="msgRoleIdentifyMap[props.message.role]">
                <div class="message-avatar">
                    <div class="message-avatar-icon">
                        <UserOutlined v-if="props.message.role === MessageRole.User" />
                    </div>
                    <div class="message-avatar-name">{{ prettyMsgRole[props.message.role] }}</div>
                </div>

                <div class="message-body">
                    <MessageContentRenderer :message="props.message" />
                </div>
            </div>
        </template>
        <div v-else class="err-unsupported-message">
            This message role is not supported.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { MessageRole, type Message } from '@/types/message';
import MessageContentRenderer from './MessageContentRenderer.vue';

const props = defineProps<{
    message: Message;
}>();

const msgRoleIdentifyMap = {
    [MessageRole.System]: 'system',
    [MessageRole.User]: 'user',
    [MessageRole.Assistant]: 'assistant',
};
const prettyMsgRole = {
    [MessageRole.System]: 'System',
    [MessageRole.User]: 'User',
    [MessageRole.Assistant]: 'Assistant',
};

</script>

<style scoped>
.vItem + .vItem > .message-item-container {
    margin-top: 1em;
}
.message-item {
    display: flex;
    flex-direction: column;
}
.message-item .message-avatar {
    display: flex;
    flex-direction: column;
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
