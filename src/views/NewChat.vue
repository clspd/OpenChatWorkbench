<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">How can I assist with you today?</h2>
        <InputMessage
            v-model="userMessage"
            v-model:modelId="modelId"
            v-model:providerId="providerId"
            v-model:features="userMessageFeatures"
            v-model:files="userMessageFiles"
            :disabled="isSending"
            @send-message="handleSendMessage" />
    </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputMessage from '@/components/InputMessage.vue'
import { useAppStateStore } from '@/stores/appState'
import { watch } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { tiptap2markdown } from '@/utils/parseTiptap'
import { message, Modal } from 'ant-design-vue'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { EMPTY_MESSAGE_JSON, type FileAttachmentInfo, MessageRole, type MessageFeatureItem, MessageContentType } from '@/types/message'
import { useAppStateSessionStore } from '@/stores/appStateSession'
import { CreateConversation, GetConvNextMessageId, InsertMessageToConversation } from '@/modules/chat/conversation'
import { CreateUserMessage } from '@/modules/chat/message'
import { GenerateResponse } from '@/modules/chat-request/respond'
import { TraceErrorAndGetString } from '@/utils/errorTrace'

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

watch(() => modelId.value, (newVal) => {
    useConfigStore().selectedModelId = newVal
})
watch(() => providerId.value, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})

watch(() => userMessage.value, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer["_"] = {
            content: newVal,
            contentType: MessageContentType.Text,
            features: userMessageFeatures.value
        }
    }
})
watch(() => userMessageFeatures.value, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer["_"] = {
            content: userMessage.value,
            contentType: MessageContentType.Text,
            features: newVal
        }
    }
}, { deep: true })

const handleSendMessage = async () => {
    if (userMessage.value === '') {
        message.error('Please enter a message')
        return
    }
    if (isSending.value) {
        message.error('Please wait for the previous message to be sent')
        return
    }
    
    isSending.value = true
    try {
        const provider = useConfigStore().providers.find(p => p.id === providerId.value)
        const model = useConfigStore().models.find(m => m.id === modelId.value)
        
        if (!provider || !model || !provider.enabled || !model.enabled) {
            message.error('Please select a valid model')
            return
        }

        const msg = tiptap2markdown(userMessage.value)

        const cid = await CreateConversation();
        if (!cid) {
            message.error('Failed to create conversation')
            return
        }

        // add user request to conversation
        const reqId = await GetConvNextMessageId(cid);
        await InsertMessageToConversation(cid, CreateUserMessage(
            reqId,
            null,
            MessageRole.User,
            MessageContentType.Text,
            msg,
            userMessageFiles.value
        ));

        // Send request
        await new Promise<void>((resolve, reject) => GenerateResponse(cid, reqId, modelId.value, providerId.value, userMessageFeatures.value, userMessageFiles.value, () => resolve()).catch(e => {
            reject(e);
            console.error('[NewChat]', "Error generating response:", e);
            Modal.error({
                title: "Failed to generate response",
                content: h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
                okText: "Cancel",
            });
        }).finally(() => {
            resolve();
        }));

        // clear send buffer
        delete useAppStateSessionStore().chatEditBuffer["_"];

        // go to conversation
        router.push(`/chat/c/${cid}`);
    } catch (error) {
        console.error('[NewChat]', "Error sending message:", error);
        message.error('Failed to send message: ' + error)
    } finally {
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
