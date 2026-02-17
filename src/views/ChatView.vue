<template>
    <div class="chat-view">
        <div v-if="notFound || !conversation" class="empty-view">
            <div class="empty-view-content">
                <CloseCircleFilled style="font-size: 64px; color: #ff4d4f;" />
                <h1>Conversation Not Found</h1>
                <div><a-button type="primary" @click="router.push('/')">Go to Home</a-button></div>
            </div>
        </div>

        <template v-else>
            <div class="messages-container">

            </div>

            <InputMessage
                v-model="messageEditorState.content"
                v-model:providerId="messageEditorState.providerId"
                v-model:modelId="messageEditorState.modelId"
                v-model:features="messageEditorState.features"
                v-model:files="messageEditorState.files"
                @send-message="handleSendMessage" />
        </template>
    </div>
</template>

<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import { LoadConversation } from '@/modules/chat/conversation';
import { useAppStateStore } from '@/stores/appState';
import type { Conversation } from '@/types/conversation';
import { CloseCircleFilled } from '@ant-design/icons-vue';
import { ref, onMounted, watch, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import InputMessage from '@/components/InputMessage.vue'
import type { FileAttachmentInfo, MessageFeatureItem } from '@/types/message';
import { message } from 'ant-design-vue';

const router = useRouter()
const props = defineProps({
    chatId: {
        type: String,
        default: '',
    },
});

const appStateStore = useAppStateStore()
const notFound = ref(false)

const conversation = ref<Conversation>();

watch(() => props.chatId, (newVal) => {
    queueMicrotask(() => LoadChat().finally(() => {
        if (conversation.value && conversation.value.session.title) {
            appStateStore.setTitle(conversation.value.session.title)
        } else {
            appStateStore.setTitle('Chat')
        }
    }))
}, { immediate: true });

async function LoadChat() {
    if (!props.chatId) {
        conversation.value = undefined
        notFound.value = true;
        return;
    }

    try {
        conversation.value = await LoadConversation(props.chatId);
        notFound.value = false;
    } catch {
        conversation.value = undefined
        notFound.value = true;
        return;
    }
}

// --------

const messageEditorState = reactive<{
    content: string,
    modelId: string,
    providerId: string,
    features: MessageFeatureItem[],
    files: FileAttachmentInfo[],
    isSending: boolean,
}>({
    content: '',
    modelId: '',
    providerId: '',
    features: [],
    files: [],
    isSending: false,
})

const handleSendMessage = async function () {
    if (messageEditorState.content === '') {
        message.error('Please enter a message')
        return
    }
    if (messageEditorState.isSending) {
        message.error('Please wait for the previous message to be sent')
        return
    }

    messageEditorState.isSending = true
    try {

    }
    catch (e) {

    }
    finally {
        messageEditorState.isSending = false
    }
}

</script>

<style scoped>
.chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.empty-view {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    text-align: center;
}

.empty-view-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: auto;
}
</style>
