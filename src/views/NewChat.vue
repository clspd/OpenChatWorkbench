<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">{{ t('common:ui.newChat.greeting._1') }}</h2>
        <InputMessage
            v-model="userMessage"
            v-model:modelId="modelId"
            v-model:providerId="providerId"
            v-model:features="userMessageFeatures"
            v-model:files="userMessageFiles"
            globalDnD
            :disabled="isSending"
            @send-message="handleSendMessage" />
    </div>
</template>

<script setup lang="ts">
// vendor
import { h, onMounted, ref, toRaw, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cloneDeep } from 'lodash-es'
import { message, Modal } from 'ant-design-vue'
import { t } from 'i18next'
// stores
import { useAppStateStore } from '@/stores/appState'
import { useConfigStore } from '@/stores/configStore'
import { useConversationStore } from '@/stores/conversationStore'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { useAppStateSessionStore } from '@/stores/appStateSession'
// types
import { EMPTY_MESSAGE_JSON, type FileAttachmentInfo, MessageRole, type MessageFeatureItem, MessageContentType } from '@/types/message'
// modules
import { CreateConversation, GetConvNextMessageId, InsertMessageToConversation } from '@/modules/chat/conversation'
import { CreateUserMessage } from '@/modules/chat/message'
import { InitConversationPreference } from '@/modules/chat/convPref'
import { GenerateResponse } from '@/modules/chat-request/respond'
// utils
import { tiptap2markdown } from '@/utils/parseTiptap'
import { TraceErrorAndGetString } from '@/utils/errorTrace'
// components
import InputMessage from '@/components/InputMessage.vue'

const userMessage = ref('')
const userMessageFeatures = ref<MessageFeatureItem[]>([])
const userMessageFiles = ref<FileAttachmentInfo[]>([])
const modelId = ref('')
const providerId = ref('')
const router = useRouter()
const isSending = ref(false)

onMounted(() => {
    useAppStateStore().setTitle('')
    providerId.value = useConfigStore().selectedProviderId
    modelId.value = useConfigStore().selectedModelId
    const buffer = useAppStateSessionStore().chatEditBuffer["_"]
    if (buffer) {
        userMessage.value = buffer.content
        userMessageFeatures.value = buffer?.features ?? useAppStatePersistStore().userSendMsgDefaultFeatures
    } else {
        userMessage.value = EMPTY_MESSAGE_JSON
        userMessageFeatures.value = useAppStatePersistStore().userSendMsgDefaultFeatures
    }
})

watch(() => providerId.value, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})
watch(() => modelId.value, (newVal) => {
    useConfigStore().selectedModelId = newVal
})

watch(() => userMessage.value, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer["_"] = {
            content: newVal,
            contentType: MessageContentType.Text,
            features: userMessageFeatures.value,
            files: userMessageFiles.value,
            isEditing: false,
        }
    }
})
watch(() => userMessageFeatures.value, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer["_"] = {
            content: userMessage.value,
            contentType: MessageContentType.Text,
            features: newVal,
            files: userMessageFiles.value,
            isEditing: false,
        }
    }
}, { deep: true })

const handleSendMessage = async () => {
    if (userMessage.value === '') {
        message.error(t('chat:newChat.errors.enterMessage'))
        return
    }
    if (isSending.value) {
        message.error(t('chat:newChat.errors.waitPrevious'))
        return
    }
    
    try {
        const provider = useConfigStore().providers.find(p => p.id === providerId.value)
        const model = useConfigStore().models.find(m => m.id === modelId.value)
        
        if (!provider || !model || !provider.enabled || !model.enabled) {
            message.error(t('chat:newChat.errors.selectValidModel'))
            return
        }

        const msg = tiptap2markdown(userMessage.value)

        const cid = await CreateConversation();
        if (!cid) {
            message.error(t('chat:newChat.errors.createConversation'))
            return
        }

        isSending.value = true
        // add user request to conversation
        const reqId = await GetConvNextMessageId(cid);
        await InsertMessageToConversation(cid, CreateUserMessage(
            reqId,
            null,
            MessageRole.User,
            MessageContentType.Text,
            msg,
            cloneDeep(toRaw(userMessageFiles.value))
        ));

        // Send request
        await new Promise<void>((resolve, reject) => GenerateResponse(cid, reqId, modelId.value, providerId.value, cloneDeep(toRaw(userMessageFeatures.value)), cloneDeep(toRaw(userMessageFiles.value)), () => InitConversationPreference(cid).then(pref => (useConversationStore().updatePref(cid, Object.assign(pref, {
            msgChainChoices: [0, 0],
        })))).then(() => resolve())).catch(e => {
            reject(e);
            console.error('[NewChat]', "Error generating response:", e);
            Modal.error({
                title: t('chat:newChat.modal.titles.generateFailed'),
                content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
                okText: t('chat:newChat.modal.cancel'),
            });
        }).finally(() => {
            resolve();
        }));

        // clear send buffer
        delete useAppStateSessionStore().chatEditBuffer["_"];

        // the `isSending` is not reset; this is expected

        // go to conversation
        router.push(`/chat/c/${cid}`);
    } catch (error) {
        console.error('[NewChat]', "Error sending message:", error);
        message.error(t('chat:newChat.errors.sendMessage') + ': ' + error)
        isSending.value = false
    }
}
</script>

<style scoped>
.new-chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1em;
}
</style>
