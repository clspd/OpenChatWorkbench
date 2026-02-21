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
                <MessageChainViewer
                    ref="messageChainViewerRef"
                    :chatId="props.chatId"
                    v-model:choices="choices"
                />

                <div v-if="conversation.messages.length" style="height: 10em; display: flex; align-items: center; justify-content: center;">
                    <div style="color: gray;">Continue your chat……</div>
                </div>
            </div>

            <div class="input-message-container">
                <div class="floating-buttons-container">
                    <a-button @click="requestScrollToTop" shape="circle" style="margin-right: 0.5em;"><ArrowUpOutlined /></a-button>
                    <a-button @click="requestScrollToBottom" shape="circle"><ArrowDownOutlined /></a-button>
                </div>
                <InputMessage
                    class="input-message-p"
                    v-model="messageEditorState.content"
                    v-model:providerId="messageEditorState.providerId"
                    v-model:modelId="messageEditorState.modelId"
                    v-model:features="messageEditorState.features"
                    v-model:files="messageEditorState.files"
                    :disabled="messageEditorState.isSending"
                    :is-generating="messageEditorState.isGenerating || hasGenerating"
                    @send-message="handleSendMessage" @interrupt-message="handleInterrupt" />
                <div class="bottom-text-overlay"></div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
// vendor
import { ref, onMounted, watch, reactive, h, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue';
import { CloseCircleFilled, LoadingOutlined } from '@ant-design/icons-vue';
// components
import InputMessage from '@/components/InputMessage.vue'
import MessageChainViewer from '@/components/MessageChainViewer.vue';
// types
import type { ConversationUserPref, Conversation } from '@/types/conversation';
import { EMPTY_MESSAGE_JSON, MessageContentType, MessageRole, type FileAttachmentInfo, type MessageFeatureItem } from '@/types/message';
// stores
import { useAppStateStore } from '@/stores/appState';
import { useConfigStore } from '@/stores/configStore';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { useAppStateSessionStore } from '@/stores/appStateSession';
// modules
import { LoadConversationPreference } from '@/modules/chat/convPref';
import { GetConvNextMessageId, InsertMessageToConversation, LoadConversation } from '@/modules/chat/conversation';
import { TraceErrorAndGetString } from '@/utils/errorTrace';
import { tiptap2markdown } from '@/utils/parseTiptap';
import { CreateUserMessage } from '@/modules/chat/message';
import { GenerateResponse } from '@/modules/chat-request/respond';
import { useConversationStore } from '@/stores/conversationStore';

const router = useRouter()
const props = defineProps({
    chatId: {
        type: String,
        default: '',
    },
});

const appState = useAppStateStore()
const conversationStore = useConversationStore()
const notFound = ref(false)

const conversation = ref<Conversation>();
const preference = ref<ConversationUserPref>();
const choices = ref<number[]>([]);
const messageChainViewerRef = ref<InstanceType<typeof MessageChainViewer>>();
const hasGenerating = computed(() => conversationStore.requestsInProgress.has(props.chatId) || messageEditorState.isGenerating);

watch(() => props.chatId, (newVal) => {
    queueMicrotask(() => LoadChat().finally(() => {
        if (conversation.value && conversation.value.session.title) {
            appState.setTitle(conversation.value.session.title)
            InitChatMsgUI();
        } else {
            appState.setTitle('Chat')
        }
    }))
}, { immediate: true });

async function LoadChat() {
    conversation.value = undefined
    if (!props.chatId) {
        notFound.value = true;
        return;
    }

    try {
        conversation.value = await LoadConversation(props.chatId);
        preference.value = await LoadConversationPreference(props.chatId);
        choices.value = preference.value.msgChainChoices;
        notFound.value = false;
        appState.currentConversationId_ = props.chatId;

        requestAnimationFrame(() => requestScrollToBottom());
    } catch {
        conversation.value = undefined;
        preference.value = undefined;
        choices.value = [];
        notFound.value = true;
        appState.currentConversationId_ = null;
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
    isGenerating: boolean,
}>({
    content: '',
    modelId: '',
    providerId: '',
    features: [],
    files: [],
    isSending: false,
    isGenerating: false,
})

onMounted(async () => {
    messageEditorState.providerId = useConfigStore().selectedProviderId;
    messageEditorState.modelId = useConfigStore().selectedModelId;
});

watch(() => messageEditorState.providerId, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})
watch(() => messageEditorState.modelId, (newVal) => {
    useConfigStore().selectedModelId = newVal
})

watch(() => messageEditorState.content, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer[props.chatId] = {
            content: newVal,
            contentType: MessageContentType.Text,
            features: messageEditorState.features
        }
    }
})
watch(() => messageEditorState.features, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer[props.chatId] = {
            content: messageEditorState.content,
            contentType: MessageContentType.Text,
            features: newVal
        }
    }
})

const requestScrollToTop = () => ((appState.mainContentViewEl as any).$el as HTMLElement)?.scrollTo({ top: 0 })
const requestScrollToBottom = () => messageChainViewerRef.value?.scrollToBottom()

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
        // get current message node id
        const currentMsgNodeIdData = messageChainViewerRef.value?.requestChatFlowData();
        if (!currentMsgNodeIdData) {
            message.error('Failed to get current message node id')
            return
        }
        const currentNodeId = currentMsgNodeIdData[currentMsgNodeIdData.length - 1]?.data.id;
        if (!currentNodeId) {
            message.error('Failed to get current message node id')
            return
        }

        const provider = useConfigStore().providers.find(p => p.id === messageEditorState.providerId)
        const model = useConfigStore().models.find(m => m.id === messageEditorState.modelId)

        if (!provider || !model || !provider.enabled || !model.enabled) {
            message.error('Please select a valid model')
            return
        }

        const msg = tiptap2markdown(messageEditorState.content)
        if (!msg.trim()) {
            message.error('Please enter a message')
            return
        }

        // add user request to conversation
        const reqId = await GetConvNextMessageId(props.chatId);
        await InsertMessageToConversation(props.chatId, CreateUserMessage(
            reqId,
            currentNodeId,
            MessageRole.User,
            MessageContentType.Text,
            msg,
            messageEditorState.files
        ));

        // Send request
        messageEditorState.isGenerating = true;
        ((appState.mainContentViewEl as any).$el as HTMLElement)?.scrollTo({ top: (messageChainViewerRef.value?.getVirtualizer().getTotalSize() ?? 0) + 100 })
        await new Promise<void>((resolve, reject) => GenerateResponse(props.chatId, reqId, model.id, provider.id, messageEditorState.features, messageEditorState.files, () => resolve()).catch(e => {
            reject(e);
            console.error('[ChatView]', "Error generating response:", e);
            Modal.error({
                title: "Failed to generate response",
                content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
                okText: "Cancel",
            });
        }).finally(() => {
            messageEditorState.isGenerating = false
            resolve();
        }));
        ((appState.mainContentViewEl as any).$el as HTMLElement)?.scrollTo({ top: (messageChainViewerRef.value?.getVirtualizer().getTotalSize() ?? 0) + 100 })

        // clear send buffer
        messageEditorState.content = EMPTY_MESSAGE_JSON;
        messageEditorState.features = useAppStatePersistStore().userSendMsgDefaultFeatures;
        messageEditorState.files = [];
        delete useAppStateSessionStore().chatEditBuffer[props.chatId];
    }
    catch (e) {
        console.error('[ChatView]', "Error sending message:", e);
        Modal.error({
            title: "Failed to send message",
            content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
            okText: "Cancel",
        });
    }
    finally {
        messageEditorState.isSending = false
    }
}

const handleInterrupt = async function () {
    if (!messageEditorState.isGenerating && !hasGenerating.value) {
        message.error('State error')
        return
    }

    const convInfo = conversationStore.requestsInProgress.get(props.chatId)
    if (!convInfo) {
        message.error('The message is not generating.')
        return
    }

    if (!convInfo.cancelToken) {
        message.error('The message is not interruptable.')
        return
    }

    convInfo.cancelToken.abort();
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
    padding: 1em 1em 0 1em;
    position: sticky;
    bottom: 0;
    pointer-events: none;
}

.input-message-container > * {
    pointer-events: auto;
}

/* .bottom-text-overlay {
    background: var(--background, #fff);
    height: 2em;
    position: absolute;
    bottom: 0; right: 1em; left: 
} */
.bottom-text-overlay {
    background: var(--background, #fff);
    height: 1em;
}

.input-message-p {
    background: var(--background, #fff);
}

.floating-buttons-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5em;
    pointer-events: none;
}

.floating-buttons-container > * {
    pointer-events: auto;
}

.messages-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}
</style>
