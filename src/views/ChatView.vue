<template>
    <div class="chat-view">
        <div v-if="conversation" class="conversation-container">
            <!-- 消息列表 -->
            <div class="message-list">
                <div v-for="message in conversation.messages" :key="message.id" class="message-item"
                    :class="`message-${message.role.toLowerCase()}`">
                    <div class="message-header">
                        <span class="message-role">{{ message.role }}</span>
                        <span class="message-model">{{ message.providerName }} - {{ message.model }}</span>
                    </div>
                    <div class="message-content">
                        <div v-for="fragment in message.fragments" :key="fragment.id" class="message-fragment"
                            :class="`fragment-${fragment.type.toLowerCase()}`">
                            <div v-html="fragment.content"></div>
                            <div v-if="fragment.elapsed > 0" class="fragment-elapsed">
                                {{ fragment.elapsed }}s
                            </div>
                        </div>
                    </div>
                    <div v-if="message.files.length > 0" class="message-files">
                        <div v-for="file in message.files" :key="file.id" class="message-file-item">
                            {{ file.name }}
                        </div>
                    </div>
                    <div class="message-footer">
                        <span class="message-status">{{ message.status }}</span>
                        <span v-if="message.accumulated_token_usage > 0" class="message-tokens">
                            {{ message.accumulated_token_usage }} tokens
                        </span>
                    </div>
                </div>
            </div>

            <!-- 输入区域 -->
            <div class="input-container">
                <InputMessage v-model="userMessage" v-model:modelId="modelId" v-model:providerId="providerId" 
                    v-model:config="userMessageConfig"
                    @send-message="handleSendMessage" :disabled="isSending" />
            </div>
        </div>
        <div v-else class="loading">
            
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/configStore'
import { useAppStateStore } from '@/stores/appState'
import InputMessage from '@/components/InputMessage.vue'
import { loadConversation, saveConversation } from '@/modules/chat/conversation'
import { sendUserMessage } from '@/modules/chat/message'
import { generateResponse } from '@/modules/chat/respond'
import { tiptap2markdown } from '@/utils/parseTiptap'
import { EMPTY_MESSAGE_JSON, MessageEditConfig, type Conversation } from '@/types/index.ts'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { useAppStateSessionStore } from '@/stores/appStateSession'

const route = useRoute()
const router = useRouter()
const conversation = ref<Conversation | null>(null)
const userMessage = ref('')
const userMessageConfig = ref(new MessageEditConfig())
const modelId = ref('')
const providerId = ref('')
const isSending = ref(false)

// 获取对话ID
const chatId = computed(() => route.params.chatId as string)

// 加载对话
const loadChat = async () => {
    if (!chatId.value) {
        router.push('/')
        return
    }

    try {
        const loadedConversation = await loadConversation(chatId.value)
        conversation.value = loadedConversation

        // 设置页面标题
        useAppStateStore().setTitle(loadedConversation.session.title)

        // 设置cached用户输入
        const cachedMessage = useAppStateSessionStore().chatEditBuffer[chatId.value]
        if (cachedMessage !== undefined) {
            userMessage.value = cachedMessage.content
            userMessageConfig.value = cachedMessage.config || new MessageEditConfig()
        } else {
            userMessage.value = EMPTY_MESSAGE_JSON
            userMessageConfig.value = new MessageEditConfig()
        }
    } catch (error) {
        console.error('Failed to load conversation:', error)
        router.push('/')
    }
}

// 发送消息
const handleSendMessage = async () => {
    if (!conversation.value || userMessage.value === '' || isSending.value) return

    isSending.value = true
    try {
        // 获取提供商和模型信息
        const provider = useConfigStore().providers.find(p => p.id === providerId.value)
        const model = useConfigStore().models.find(m => m.id === modelId.value)

        if (!provider || !model) {
            console.error('Invalid provider or model')
            return
        }

        // 转换为 markdown 格式
        const userMessageMd = tiptap2markdown(userMessage.value)

        // 发送用户消息
        const userMsg = await sendUserMessage(
            conversation.value,
            userMessageMd,
            modelId.value,
            providerId.value,
            provider.name
        )

        await saveConversation(conversation.value)

        // 清空输入
        userMessage.value = ''

        // 滚动到底部
        setTimeout(() => {
            const messageList = document.querySelector('.message-list')
            if (messageList) {
                messageList.scrollTop = messageList.scrollHeight
            }
        }, 100)

        // 生成响应
        await generateResponse(
            conversation.value,
            userMsg.id,
            providerId.value,
            modelId.value,
            userMessageConfig.value,
            // onComplete - 响应完成
            () => {
                // 滚动到底部
                setTimeout(() => {
                    const messageList = document.querySelector('.message-list')
                    if (messageList) {
                        messageList.scrollTop = messageList.scrollHeight
                    }
                }, 100)
            },
            // onError - 错误处理
            (error) => {
                console.error('Failed to generate response:', error)
            }
        )
    } catch (error) {
        console.error('Failed to send message:', error)
    } finally {
        isSending.value = false
    }
}

onMounted(async () => {
    // 设置默认模型和提供商
    modelId.value = useConfigStore().selectedModelId
    providerId.value = useConfigStore().selectedProviderId

    // 加载对话
    await loadChat()
})

// 监听路由变化
watch(() => route.params.chatId, async () => {
    await loadChat()
})

// 监听模型和提供商变化
watch(() => modelId.value, (newVal) => {
    useConfigStore().selectedModelId = newVal
})

watch(() => providerId.value, (newVal) => {
    useConfigStore().selectedProviderId = newVal
})

// 监听用户输入变化
watch(() => userMessage.value, (newValue) => {
    // 缓存用户输入
    useAppStateSessionStore().chatEditBuffer[chatId.value] = {
        content: newValue,
        config: userMessageConfig.value
    }
})

// 监听用户输入配置变化
watch(() => userMessageConfig.value, (newValue) => {
    // 缓存用户输入配置
    useAppStateSessionStore().chatEditBuffer[chatId.value] = {
        content: userMessage.value,
        config: newValue
    }
}, { deep: true })
</script>

<style scoped>
.chat-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.conversation-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.message-list {
    flex: 1;
    overflow-y: auto;
    padding: 1em;
    display: flex;
    flex-direction: column;
    gap: 1em;
}

.message-item {
    padding: 1em;
    border-radius: 0.5em;
    background-color: var(--message-bg);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.message-user {
    align-self: flex-end;
    background-color: var(--message-user-bg);
    color: var(--message-user-text);
}

.message-assistant {
    align-self: flex-start;
    background-color: var(--message-assistant-bg);
    color: var(--message-assistant-text);
}

.message-system {
    align-self: center;
    background-color: var(--message-system-bg);
    color: var(--message-system-text);
    font-style: italic;
}

.message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5em;
    font-size: 0.8em;
    opacity: 0.8;
}

.message-role {
    font-weight: bold;
}

.message-content {
    margin-bottom: 0.5em;
}

.message-fragment {
    margin-bottom: 0.5em;
}

.fragment-request {
    font-weight: normal;
}

.fragment-think {
    font-style: italic;
    opacity: 0.8;
}

.fragment-response {
    font-weight: normal;
}

.fragment-elapsed {
    font-size: 0.7em;
    opacity: 0.7;
    text-align: right;
}

.message-files {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    margin-bottom: 0.5em;
    padding: 0.5em;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 0.25em;
}

.message-file-item {
    font-size: 0.8em;
    color: var(--link-color);
}

.message-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7em;
    opacity: 0.7;
}

.input-container {
    padding: 1em;
    background-color: var(--input-bg);
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.2em;
    color: var(--text-secondary);
}
</style>
