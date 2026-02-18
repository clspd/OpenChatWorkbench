<template>
    <div class="chat-view">
        <div v-if="notFound" class="empty-view">
            <div class="empty-view-content">
                <CloseCircleFilled style="font-size: 64px; color: #ff4d4f;" />
                <h1>Conversation Not Found</h1>
                <div><a-button type="primary" @click="router.push('/')">Go to Home</a-button></div>
            </div>
        </div>

        <div v-else-if="!conversation" class="loading-view">
            <LoadingOutlined style="font-size: 3em; color: var(--color-primary, #1890ff);" class="my-loading-indicator" />
        </div>

        <template v-else>
            <div class="messages-container">
                TODO: render messages
            </div>

            <div class="input-message-container">
                <InputMessage
                    v-model="messageEditorState.content"
                    v-model:providerId="messageEditorState.providerId"
                    v-model:modelId="messageEditorState.modelId"
                    v-model:features="messageEditorState.features"
                    v-model:files="messageEditorState.files"
                    @send-message="handleSendMessage" />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import { LoadConversation } from '@/modules/chat/conversation';
import { useAppStateStore } from '@/stores/appState';
import type { Conversation } from '@/types/conversation';
import { CloseCircleFilled, LoadingOutlined } from '@ant-design/icons-vue';
import { ref, onMounted, watch, computed, reactive, h } from 'vue'
import { useRouter } from 'vue-router'
import InputMessage from '@/components/InputMessage.vue'
import { EMPTY_MESSAGE_JSON, type FileAttachmentInfo, type MessageFeatureItem } from '@/types/message';
import { message } from 'ant-design-vue';
import { useConfigStore } from '@/stores/configStore';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { useAppStateSessionStore } from '@/stores/appStateSession';

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
            InitChatMsgUI();
        } else {
            appStateStore.setTitle('Chat')
        }
    }))
}, { immediate: true });

async function LoadChat() {
    conversation.value = undefined
    if (!props.chatId) {
        notFound.value = true;
        return;
    }

    // await new Promise(resolve => setTimeout(resolve, 10000)); // debug

    try {
        conversation.value = await LoadConversation(props.chatId);
        notFound.value = false;
    } catch {
        conversation.value = undefined
        notFound.value = true;
        return;
    }
}

async function InitChatMsgUI() {
    if (!conversation.value) return;
    const buffer = useAppStateSessionStore().chatEditBuffer[props.chatId];
    if (buffer) {
        messageEditorState.content = buffer.content
        messageEditorState.features = buffer?.features ?? useAppStatePersistStore().userSendMsgDefaultFeatures
    } else {
        messageEditorState.content = EMPTY_MESSAGE_JSON
        messageEditorState.features = useAppStatePersistStore().userSendMsgDefaultFeatures
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

onMounted(async () => {
    messageEditorState.providerId = useConfigStore().selectedProviderId;
    messageEditorState.modelId = useConfigStore().selectedModelId;
});

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

.loading-view {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.loading-view .my-loading-indicator {
    animation: spin 0.5s linear infinite;
}

.input-message-container {
    padding: 1em;
    position: sticky;
    bottom: 0;
    background: var(--background, #fff);
}

.messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}
</style>
