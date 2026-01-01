<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import MessageInput from '@/components/MessageInput.vue'
import { Empty } from 'ant-design-vue'

const chatStore = useChatStore()
const messagesContainer = ref<HTMLElement | null>(null)

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

onMounted(() => {
  scrollToBottom()
})

watch(() => chatStore.activeConversation?.messages, () => {
  scrollToBottom()
}, { deep: true })
</script>

<template>
  <div class="chat-view">
    <!-- 顶部：对话名称 -->
    <div class="chat-header">
      <h1>{{ chatStore.activeConversation?.title || '新对话' }}</h1>
    </div>
    
    <!-- 中间：消息记录 -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="!chatStore.activeConversation?.messages.length" class="empty-messages">
        <Empty description="开始新的对话吧" />
      </div>
      
      <div class="messages">
        <div 
          v-for="msg in chatStore.activeConversation?.messages" 
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-content">
            {{ msg.content }}
          </div>
          <div class="message-time">
            {{ new Date(msg.timestamp).toLocaleTimeString() }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部：消息输入区域 -->
    <div class="chat-footer">
      <MessageInput />
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
  z-index: 10;
}

.chat-header h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
}

.empty-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 800px;
  align-self: center;
  width: 100%;
}

.message-item {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.message-item.user {
  align-self: flex-end;
  align-items: flex-end;
}

.message-item.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-item.user .message-content {
  background-color: #1890ff;
  color: white;
  border-bottom-right-radius: 2px;
}

.message-item.assistant .message-content {
  background-color: white;
  color: rgba(0, 0, 0, 0.85);
  border: 1px solid #f0f0f0;
  border-bottom-left-radius: 2px;
}

.message-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 4px;
}

.chat-footer {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background-color: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.09);
}
</style>