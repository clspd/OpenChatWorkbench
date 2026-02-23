<template>
    <div class="chat-view">
        <div v-if="notFound" class="empty-view">
            <div class="empty-view-content">
                <CloseCircleFilled style="font-size: 64px; color: #ff4d4f;" />
                <h1>{{ t('chat:chatView.emptyState.title') }}</h1>
                <div><a-button type="primary" @click="router.push('/')">{{ t('chat:chatView.emptyState.goToHome') }}</a-button></div>
            </div>
        </div>

        <div v-else-if="!conversation" class="loading-view">
            <LoadingOutlined style="font-size: 3em; color: var(--color-primary, #1890ff);" class="my-loading-indicator" />
        </div>

        <template v-else>
            <div class="messages-container">
                <MessageChainViewer
                    ref="messageChainViewerRef"
                    :chatId="chatId"
                    :choices="choices"
                    :disabled="messageEditorState.editMessage?.isEditing"
                    @update:choices="updateChoices"
                    @request-regenerate="handleRequestRegenerateMessage"
                    @request-edit-and-send="handleRequestEditMessage"
                    @request-edit-only="handleRequestEditedMessage"
                />

                <div v-if="conversation.messages.length" style="height: 2em; display: flex; align-items: center; justify-content: center;"></div>
            </div>

            <div class="input-message-container">
                <div class="floating-buttons-container">
                    <a-button @click="requestScrollTo('top')" shape="circle"><ArrowUpOutlined /></a-button>
                    <a-button @click="requestScrollTo('prev')" shape="circle"><UpOutlined /></a-button>
                    <a-button @click="requestScrollTo('next')" shape="circle"><DownOutlined /></a-button>
                    <a-button @click="requestScrollTo('bottom')" shape="circle"><ArrowDownOutlined /></a-button>
                </div>
                <InputMessage
                    class="input-message-p"
                    ref="inputMessageRef"
                    v-model="messageEditorState.content"
                    v-model:providerId="messageEditorState.providerId"
                    v-model:modelId="messageEditorState.modelId"
                    v-model:features="messageEditorState.features"
                    v-model:files="messageEditorState.files"
                    globalDnD
                    :disabled="messageEditorState.isSending"
                    :is-generating="messageEditorState.isGenerating || hasGenerating"
                    :is-editing="messageEditorState.editMessage?.isEditing"
                    :edit-message-id="messageEditorState.editMessage?.editId"
                    @update:is-editing="cancelEditMessage"
                    @send-message="handleSendMessage" @interrupt-message="handleInterrupt" />
                <div class="bottom-text-overlay"></div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
// vendor
import { ref, onMounted, watch, reactive, h, computed, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cloneDeep } from 'lodash-es';
import { message, Modal } from 'ant-design-vue';
import { CloseCircleFilled, LoadingOutlined } from '@ant-design/icons-vue';
import { t } from 'i18next';
// components
import InputMessage from '@/components/InputMessage.vue'
import MessageChainViewer from '@/components/MessageChainViewer.vue';
// types
import type { ConversationUserPref, Conversation } from '@/types/conversation';
import { EMPTY_MESSAGE_JSON, MessageContentType, MessageRole, type FileAttachmentInfo, type Message, type MessageFeatureItem } from '@/types/message';
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
import { CreateUserMessage, ExtractMessageHTML } from '@/modules/chat/message';
import { GenerateResponse } from '@/modules/chat-request/respond';
import { useConversationStore } from '@/stores/conversationStore';

const router = useRouter()
const route = useRoute()
const props = defineProps({
    chatId: {
        type: String,
        default: '',
    },
});
const chatId = computed(() => typeof route.params.chatId === 'string' ? route.params.chatId : props.chatId)

const appState = useAppStateStore()
const conversationStore = useConversationStore()
const notFound = ref(false)

const conversation = ref<Conversation>();
const preference = ref<ConversationUserPref>();
const choices = ref<number[]>([]);
const messageChainViewerRef = ref<InstanceType<typeof MessageChainViewer>>();
const hasGenerating = computed(() => conversationStore.requestsInProgress.has(chatId.value) || messageEditorState.isGenerating);

watch(() => chatId.value, (newVal) => {
    console.debug('[ChatView]', 'Load chat, chatId=', newVal)
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
    if (!chatId.value) {
        notFound.value = true;
        return;
    }

    try {
        const conv = await LoadConversation(chatId.value);
        const pref = await LoadConversationPreference(chatId.value);
        // if (await FixInterruptedConversationData(conv)) conversationStore.updateConvInStore(chatId.value, conv);
        conversation.value = conv;
        preference.value = pref;
        choices.value = pref.choices;
        notFound.value = false;
        appState.currentConversationId_ = chatId.value;

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
    const buffer = useAppStateSessionStore().chatEditBuffer[chatId.value];
    if (buffer) {
        messageEditorState.content = buffer.content
        messageEditorState.features = buffer?.features ?? useAppStatePersistStore().userSendMsgDefaultFeatures
        messageEditorState.files = buffer.files
        if (buffer?.isEditing) {
            messageEditorState.editMessage = {
                isEditing: buffer.isEditing,
                editId: buffer.editId ?? 0,
                parentId: buffer.parentId ?? null,
                newChoices: buffer.newChoices ?? [],
                oldEditorState: {
                    content: buffer.oldEditorState?.content ?? '',
                    features: buffer.oldEditorState?.features ?? [],
                    files: buffer.oldEditorState?.files ?? [],
                    providerId: useConfigStore().selectedProviderId,
                    modelId: useConfigStore().selectedModelId,
                    isSending: false,
                    isGenerating: false,
                },
            }
        }
    } else {
        messageEditorState.content = EMPTY_MESSAGE_JSON
        messageEditorState.features = useAppStatePersistStore().userSendMsgDefaultFeatures
        messageEditorState.files = []
    }
}

// --------

interface MessageEditorState {
    content: string;
    modelId: string;
    providerId: string;
    features: MessageFeatureItem[];
    files: FileAttachmentInfo[];
    isSending: boolean;
    isGenerating: boolean;
    editMessage?: {
        isEditing: boolean;
        editId: number;
        parentId: number | null;
        newChoices: number[];
        oldEditorState: MessageEditorState | null;
    };
}
const messageEditorState = reactive<MessageEditorState>({
    content: '',
    modelId: '',
    providerId: '',
    features: [],
    files: [],
    isSending: false,
    isGenerating: false,
    editMessage: {
        isEditing: false,
        editId: 0,
        parentId: 0 as number | null,
        newChoices: [] as number[],
        oldEditorState: null as MessageEditorState | null,
    },
});
const inputMessageRef = ref<InstanceType<typeof InputMessage>>();

onMounted(async () => {
    console.debug('[ChatView]', 'Mounted at', Date.now(), 'chatId=', chatId.value)
    messageEditorState.providerId = useConfigStore().selectedProviderId;
    messageEditorState.modelId = useConfigStore().selectedModelId;
});

watch(() => messageEditorState.providerId, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})
watch(() => messageEditorState.modelId, (newVal) => {
    useConfigStore().selectedModelId = newVal
})

const updateEditBuffer = () => useAppStateSessionStore().chatEditBuffer[chatId.value] = {
    content: messageEditorState.content,
    contentType: MessageContentType.Text,
    features: messageEditorState.features,
    files: messageEditorState.files,
    isEditing: messageEditorState.editMessage?.isEditing ?? false,
    editId: messageEditorState.editMessage?.editId,
    parentId: messageEditorState.editMessage?.parentId,
    newChoices: messageEditorState.editMessage?.newChoices,
    oldEditorState: messageEditorState.editMessage?.oldEditorState ?? undefined,
};

watch(() => messageEditorState.content, (newVal) => {
    if (newVal) updateEditBuffer();
})
watch(() => messageEditorState.features, (newVal) => {
    if (newVal) updateEditBuffer();
})
watch(() => messageEditorState.files, (newVal) => {
    if (newVal) updateEditBuffer();
})

const requestScrollTo = (pos: 'top' | 'prev' | 'next' | 'bottom') => {
    const virtualizer = messageChainViewerRef.value?.getVirtualizer();
    if (!virtualizer) return;
    if (pos === 'top') {
        virtualizer.scrollToIndex(0)
    } else if (pos === 'bottom') {
        virtualizer.scrollToIndex(virtualizer.getVirtualIndexes().length - 1, {
            align: 'end',
        })
    } else {
        const currentOffset = virtualizer.scrollOffset
        if (currentOffset != null) { 
            const idx = virtualizer.getVirtualItemForOffset(currentOffset);
            // console.debug('[ChatView]', 'requestScrollTo', 'currentOffset=', currentOffset, 'idx=', idx?.index, pos);
            if (idx?.index != null) {
                virtualizer.scrollToIndex(idx.index + (pos === 'next' ? 1 : -1), {
                    align: 'start',
                });
            }
        }
    }
}
const requestScrollToBottom = () => requestScrollTo('bottom')

const coreSendMessage = async function (

) {

}

const handleSendMessage = async function () {
    if (messageEditorState.content === '') {
        message.error(t('chat:chatView.errors.enterMessage'))
        return
    }
    if (messageEditorState.isSending) {
        message.error(t('chat:chatView.errors.waitPrevious'))
        return
    }

    messageEditorState.isSending = true
    try {
        // get current message node id
        const currentMsgNodeIdData = messageChainViewerRef.value?.requestChatFlowData();
        if (!currentMsgNodeIdData) {
            message.error(t('chat:chatView.errors.getMessageNodeId'))
            return
        }
        const currentNodeId =
            messageEditorState.editMessage?.isEditing ?
            messageEditorState.editMessage.parentId :
            currentMsgNodeIdData[currentMsgNodeIdData.length - 1]?.data.id;
        if (undefined === currentNodeId) { // allow null for root message
            message.error(t('chat:chatView.errors.getMessageNodeId'))
            return
        }

        const provider = useConfigStore().providers.find(p => p.id === messageEditorState.providerId)
        const model = useConfigStore().models.find(m => m.id === messageEditorState.modelId)

        if (!provider || !model || !provider.enabled || !model.enabled) {
            message.error(t('chat:chatView.errors.selectValidModel'))
            return
        }

        const msg = tiptap2markdown(messageEditorState.content)

        // add user request to conversation
        const reqId = await GetConvNextMessageId(chatId.value);
        await InsertMessageToConversation(chatId.value, CreateUserMessage(
            reqId,
            currentNodeId,
            MessageRole.User,
            MessageContentType.Text,
            msg,
            cloneDeep(toRaw(messageEditorState.files))
        ));

        // Send request
        messageEditorState.isGenerating = true;
        requestScrollToBottom();
        await new Promise<void>((resolve, reject) => GenerateResponse(chatId.value, reqId, model.id, provider.id, cloneDeep(toRaw(messageEditorState.features)), cloneDeep(toRaw(messageEditorState.files)), () => (
            inputMessageRef.value?.focus(),
            updateChoices(messageEditorState.editMessage?.isEditing ?
                (messageEditorState.editMessage.newChoices.push(0), choices.value = messageEditorState.editMessage.newChoices) :
                (choices.value.push(0, 0), choices.value)
            ).then(() => (
                resolve()
            ))
        )).catch(e => {
            reject(e);
            console.error('[ChatView]', "Error generating response:", e);
            Modal.error({
                title: t('chat:chatView.modal.titles.generateFailed'),
                content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
                okText: t('chat:chatView.modal.cancel'),
            });
        }).finally(() => {
            messageEditorState.isGenerating = false
            resolve();
        }));
        requestScrollToBottom();

        // clear send buffer
        messageEditorState.content = EMPTY_MESSAGE_JSON;
        messageEditorState.features = useAppStatePersistStore().userSendMsgDefaultFeatures;
        messageEditorState.files = [];
        delete useAppStateSessionStore().chatEditBuffer[chatId.value];
    }
    catch (e) {
        console.error('[ChatView]', "Error sending message:", e);
        Modal.error({
            title: t('chat:chatView.modal.titles.sendFailed'),
            content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
            okText: t('chat:chatView.modal.cancel'),
        });
    }
    finally {
        messageEditorState.isSending = false;
        if (messageEditorState.editMessage?.isEditing) {
            messageEditorState.editMessage.isEditing = false;
            messageEditorState.editMessage.parentId = null;
            messageEditorState.editMessage.newChoices = [];
        }
    }
}

const handleInterrupt = async function () {
    if (!messageEditorState.isGenerating && !hasGenerating.value) {
        message.error(t('chat:chatView.errors.stateError'))
        return
    }

    const convInfo = conversationStore.requestsInProgress.get(chatId.value)
    if (!convInfo) {
        message.error(t('chat:chatView.errors.notGenerating'))
        return
    }

    if (!convInfo.cancelToken) {
        message.error(t('chat:chatView.errors.notInterruptable'))
        return
    }

    convInfo.cancelToken.abort();
}

const updateChoices = async (newVal: number[]) => {
    choices.value = newVal;
    preference.value = await conversationStore.getPref(chatId.value);
    if (!preference.value) {
        message.error(t('chat:chatView.errors.getConversationPref'))
        return
    }
    preference.value.choices = newVal;
    await conversationStore.updatePref(chatId.value, preference.value);
}

const handleRequestRegenerateMessage = async function (id: number, parent_id: number, newChoices: number[]) {
    if (!conversation.value) return;
    messageEditorState.isSending = true
    try {
        const data = conversation.value?.messages.find((msg) => msg.id === id);
        if (!data || (!data.model) || (!data.provider) || (typeof data.model !== 'string') || !data.features || !data.files) {
            message.error(t('chat:chatView.errors.getMessageData'));
            return;
        }
        // Send request
        messageEditorState.isGenerating = true;
        requestScrollToBottom();
        await new Promise<void>((resolve, reject) => GenerateResponse(
            chatId.value,
            parent_id,
            messageEditorState.modelId,
            messageEditorState.providerId,
            cloneDeep(toRaw(messageEditorState.features)),
            cloneDeep(toRaw(data.files)),
        () => (inputMessageRef.value?.focus(), choices.value = newChoices, updateChoices(newChoices).then(() => resolve()))).catch(e => {
            reject(e);
            console.error('[ChatView]', "Error generating response:", e);
            Modal.error({
                title: t('chat:chatView.modal.titles.generateFailed'),
                content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
                okText: t('chat:chatView.modal.cancel'),
            });
        }).finally(() => {
            messageEditorState.isGenerating = false
            resolve();
        }));
        requestScrollToBottom();
    }
    catch (e) {
        console.error('[ChatView]', "Error regenerating message:", e);
        Modal.error({
            title: t('chat:chatView.modal.titles.regenerateFailed'),
            content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
            okText: t('chat:chatView.modal.cancel'),
        });
    }
    finally {
        messageEditorState.isSending = false
    }
}

const handleRequestEditMessage = async function (id: number, parent_id: number | null, newChoices: number[]) {
    const node = conversation.value?.messages.find((msg) => msg.id === id);
    if (!node) {
        message.error(t('chat:chatView.errors.getMessageData'));
        return;
    }
    if (!inputMessageRef.value) {
        message.error(t('chat:chatView.errors.getInputRef'));
        return;
    }
    messageEditorState.editMessage = {
        isEditing: true,
        editId: id,
        parentId: parent_id,
        newChoices: newChoices,
        oldEditorState: (JSON.parse(JSON.stringify(messageEditorState))),
    };
    inputMessageRef.value.setHTML(ExtractMessageHTML(node));
    if (node.features) messageEditorState.features = node.features;
    if (node.files) messageEditorState.files = node.files;
    updateEditBuffer();
    requestAnimationFrame(() => inputMessageRef.value?.focus());
}

const handleRequestEditedMessage = async function (newData: Message, parent_id: number | null, newChoices: number[]) {
    try {
        const fullData = await LoadConversation(chatId.value);
        fullData.messages.push(newData);
        const pref = await conversationStore.getPref(chatId.value);
        pref.choices = newChoices;
        await conversationStore.updateConvInStore(chatId.value, fullData);
        await conversationStore.updatePref(chatId.value, pref);
        choices.value = newChoices;
    }
    catch (e) {
        console.error('[ChatView]', "Error editing message:", e);
        message.error(String(e))
    }
}

const cancelEditMessage = () => {
    if (!messageEditorState.editMessage) return;
    messageEditorState.editMessage.isEditing = false;
    messageEditorState.editMessage.editId = 0;
    messageEditorState.editMessage.parentId = null;
    messageEditorState.editMessage.newChoices = [];
    if (messageEditorState.editMessage.oldEditorState) {
        Object.assign(messageEditorState, messageEditorState.editMessage.oldEditorState);
    }
    messageEditorState.editMessage.oldEditorState = null;
    updateEditBuffer();
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
    gap: 0.5em;
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
