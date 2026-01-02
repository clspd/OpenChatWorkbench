<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">How can I assist with you today?</h2>
        <InputMessage
            v-model="userMessage"
            v-model:modelId="modelId"
            v-model:providerId="providerId"
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
import { createNewConversation, saveConversation } from '@/modules/chat/conversation'
import { sendUserMessage } from '@/modules/chat/message'
import { tiptap2markdown } from '@/util/parseTiptap'

const userMessage = ref('')
const modelId = ref('')
const providerId = ref('')
const router = useRouter()
const isSending = ref(false)

onMounted(() => {
    useAppStateStore().setTitle('')
    modelId.value = useConfigStore().selectedModelId
    providerId.value = useConfigStore().selectedProviderId
})

watch(() => modelId.value, (newVal) => {
    useConfigStore().selectedModelId = newVal
})
watch(() => providerId.value, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})

const handleSendMessage = async () => {
    if (userMessage.value === '' || isSending.value) return
    
    isSending.value = true
    try {
        const provider = useConfigStore().providers.find(p => p.id === providerId.value)
        const model = useConfigStore().models.find(m => m.id === modelId.value)
        
        if (!provider || !model) {
            console.error('Invalid provider or model')
            return
        }

        const userMessageJson = userMessage.value
        const userMessageMd = tiptap2markdown(userMessageJson)
        
        const conversation = await createNewConversation()
        
        await sendUserMessage(
            conversation,
            userMessageMd,
            modelId.value,
            providerId.value,
            provider.name
        )
        
        await saveConversation(conversation)
        
        userMessage.value = ''
        
        router.push(`/chat/c/${conversation.id}`)
    } catch (error) {
        console.error('Failed to send message:', error)
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
