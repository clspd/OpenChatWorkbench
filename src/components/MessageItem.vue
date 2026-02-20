<template>
    <div class="message-item-container">
        <template v-if="
    props.message.role === MessageRole.System ||
    props.message.role === MessageRole.User || 
    props.message.role === MessageRole.Assistant">
            <div class="message-item" :data-role="msgRoleIdentifyMap[props.message.role]">
                <div class="message-avatar">
                    <div class="message-avatar-icon">Icon(TODO)</div>
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


</style>
