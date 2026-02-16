<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">How can I assist with you today?</h2>
        <InputMessage
            v-model="userMessage"
            v-model:modelId="modelId"
            v-model:providerId="providerId"
            v-model:features="userMessageFeatures"
            @send-message="handleSendMessage" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputMessage from '@/components/InputMessage.vue'
import { useAppStateStore } from '@/stores/appState'
import { watch } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { tiptap2markdown } from '@/utils/parseTiptap'
import { message } from 'ant-design-vue'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { EMPTY_MESSAGE_JSON, type MessageFeatureItem } from '@/types/message'
import { useAppStateSessionStore } from '@/stores/appStateSession'
import { CreateConversation } from '@/modules/chat/conversation'
import { AddConversationToIndex, GetCurrentConvIndexId } from '@/modules/chat/convIndex'

const userMessage = ref('')
const userMessageFeatures = ref<MessageFeatureItem[]>([])
const modelId = ref('')
const providerId = ref('')
const router = useRouter()
const isSending = ref(false)

onMounted(() => {
    useAppStateStore().setTitle('')
    modelId.value = useConfigStore().selectedModelId
    providerId.value = useConfigStore().selectedProviderId
    const buffer = useAppStateSessionStore().chatEditBuffer["_"]
    if (buffer) {
        userMessage.value = buffer.content
        userMessageFeatures.value = buffer?.features || []
    } else {
        userMessage.value = EMPTY_MESSAGE_JSON
        userMessageFeatures.value = []
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
            features: userMessageFeatures.value
        }
    }
})
watch(() => userMessageFeatures.value, (newVal) => {
    if (newVal) {
        useAppStateSessionStore().chatEditBuffer["_"] = {
            content: userMessage.value,
            features: newVal
        }
    }
}, { deep: true })

const handleSendMessage = async () => {
    if (userMessage.value === '' || isSending.value) {
        message.error('Please enter a message')
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

        // add a REQUEST to conversation
        
    } catch (error) {
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
