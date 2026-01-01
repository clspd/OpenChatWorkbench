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
import InputMessage from '@/components/InputMessage.vue'
import { useAppStateStore } from '@/stores/appState'
import { watch } from 'vue'
import { useConfigStore } from '@/stores/configStore'

const userMessage = ref('')
const modelId = ref('')
const providerId = ref('')

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


const handleSendMessage = () => {
    if (userMessage.value === '') return
    console.log('Sending message:', userMessage.value)
    
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
