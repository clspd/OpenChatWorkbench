<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">{{ t('common:ui.newChat.greeting._1') }}</h2>
        <InputMessage
            v-model="userMessage"
            v-model:modelId="modelId"
            v-model:providerId="providerId"
            v-model:features="userMessageFeatures"
            v-model:files="userMessageFiles"
            isCreatingConversation
            globalDnD
            :disabled="isSending"
            @edit-system-prompt="showSystemPromptEditor = true"
            @send-message="handleSendMessage" />
        
        <DialogView v-model="showSystemPromptEditor" :close-on-click-mask="true" class="system-prompt-editor">
            <template #title>
                {{ t('common:ui.newChat.systemPrompt.title') }}
            </template>

            <a-textarea autofocus v-model:value="systemPrompt" class="system-prompt-textarea" :placeholder="t('common:ui.newChat.systemPrompt.placeholder')"></a-textarea>

            <template #footer>
                <div class="sys-prompt-editor-footer">
                    <a-button type="primary" @click="showSystemPromptEditor = false">{{ t('common:ui.dialog.save') }}</a-button>
                    <a-button @click="systemPrompt = ''" v-if="false">{{ t('common:ui.dialog.clear') }}</a-button>
                </div>
            </template>
        </DialogView>
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
import { DialogView } from 'vue-dialog-view'

const userMessage = ref('')
const userMessageFeatures = ref<MessageFeatureItem[]>([])
const userMessageFiles = ref<FileAttachmentInfo[]>([])
const modelId = ref('')
const providerId = ref('')
const router = useRouter()
const isSending = ref(false)
const showSystemPromptEditor = ref(false)
const systemPrompt = ref('')

const appState = useAppStateStore()
const configStore = useConfigStore()
const appStatePersist = useAppStatePersistStore()
const appStateSession = useAppStateSessionStore()

onMounted(() => {
    useAppStateStore().setTitle('')
    providerId.value = configStore.selectedProviderId
    modelId.value = configStore.selectedModelId
    const buffer = appStateSession.chatEditBuffer["_"]
    if (buffer) {
        userMessage.value = buffer.content
        userMessageFeatures.value = buffer?.features ?? appStatePersist.userSendMsgDefaultFeatures
        systemPrompt.value = buffer?.systemPrompt ?? appStatePersist.defaultSystemPrompt
    } else {
        userMessage.value = EMPTY_MESSAGE_JSON
        userMessageFeatures.value = appStatePersist.userSendMsgDefaultFeatures
        systemPrompt.value = appStatePersist.defaultSystemPrompt
    }
})

watch(() => providerId.value, (newVal) => {
    configStore.selectedProviderId = newVal
})
watch(() => modelId.value, (newVal) => {
    configStore.selectedModelId = newVal
})

watch(() => userMessage.value, (newVal) => {
    if (newVal) {
        appStateSession.chatEditBuffer["_"] = {
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
        appStateSession.chatEditBuffer["_"] = {
            content: userMessage.value,
            contentType: MessageContentType.Text,
            features: newVal,
            files: userMessageFiles.value,
            isEditing: false,
        }
    }
}, { deep: true })

watch(() => systemPrompt.value, (newVal) => {
    if (newVal) {
        appStateSession.chatEditBuffer["_"] = {
            content: userMessage.value,
            contentType: MessageContentType.Text,
            features: userMessageFeatures.value,
            files: userMessageFiles.value,
            isEditing: false,
            systemPrompt: newVal,
        }
    }
})

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
        const provider = configStore.providers.find(p => p.id === providerId.value)
        const model = configStore.models.find(m => m.id === modelId.value)
        
        if (!provider || !model || !provider.enabled || !model.enabled) {
            message.error(t('chat:newChat.errors.selectValidModel'))
            return
        }

        const msg = tiptap2markdown(userMessage.value)

        const cid = await CreateConversation(msg.length > 30 ? msg.substring(0, 30) : msg);
        if (!cid) {
            message.error(t('chat:newChat.errors.createConversation'))
            return
        }

        isSending.value = true
        // add user request to conversation
        let reqId = await GetConvNextMessageId(cid), oldReqId: number | null = null;

        const hasSystemPrompt = !!systemPrompt.value;
        if (hasSystemPrompt) {
            await InsertMessageToConversation(cid, CreateUserMessage(
                reqId,
                null,
                MessageRole.System,
                MessageContentType.Text,
                systemPrompt.value,
                []
            ));
            oldReqId = reqId;
            reqId = await GetConvNextMessageId(cid);
        }

        await InsertMessageToConversation(cid, CreateUserMessage(
            reqId,
            oldReqId,
            MessageRole.User,
            MessageContentType.Text,
            msg,
            cloneDeep(toRaw(userMessageFiles.value))
        ));

        // Send request
        await new Promise<void>((resolve, reject) => GenerateResponse(cid, reqId, modelId.value, providerId.value, cloneDeep(toRaw(userMessageFeatures.value)), cloneDeep(toRaw(userMessageFiles.value)), () => InitConversationPreference(cid).then(pref => (useConversationStore().updatePref(cid, Object.assign(pref, {
            choices: hasSystemPrompt ? [0, 0, 0] : [0, 0],
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

.system-prompt-editor {
    width: 100%;
    height: 100%;
}

.system-prompt-textarea {
    flex: 1;
    resize: none;
    padding: 0.5em;
    border-radius: 10px;
}

.sys-prompt-editor-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
}
</style>
