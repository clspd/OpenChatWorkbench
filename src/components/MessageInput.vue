<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { Button, Select, Upload, Input } from 'ant-design-vue'
import { SendOutlined, PaperClipOutlined } from '@ant-design/icons-vue'

const chatStore = useChatStore()
const messageContent = ref('')
const inputRef = ref<InstanceType<typeof Input.TextArea> | null>(null)

const handleSend = () => {
  if (messageContent.value.trim()) {
    chatStore.sendMessage(messageContent.value.trim())
    messageContent.value = ''
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleModelChange = (value: any) => {
  if (typeof value === 'string') {
    chatStore.setSelectedModel(value)
  }
}

const dummyRequest = (options: any) => {
  setTimeout(() => {
    if (options.onSuccess) {
      options.onSuccess('ok')
    }
  }, 0)
}
</script>

<template>
  <div class="message-input-container">
    <div class="model-selection">
      <Select
        v-model:value="chatStore.selectedModel"
        :options="chatStore.models.map(model => ({ label: model, value: model }))"
        style="width: 200px"
        @change="handleModelChange"
      />
    </div>
    
    <div class="input-wrapper">
      <div class="input-area">
        <Input.TextArea
          ref="inputRef"
          v-model:value="messageContent"
          placeholder="输入消息..."
          :rows="4"
          allowClear
          @keydown="handleKeyDown"
          show-count
          max-length="2000"
          resize="none"
        />
      </div>
      
      <div class="action-buttons">
        <Upload
          name="file"
          action="#"
          :custom-request="dummyRequest"
          :show-upload-list="false"
        >
          <Button :icon="PaperClipOutlined" type="text" />
        </Upload>
        
        <Button 
          type="primary" 
          :icon="SendOutlined" 
          @click="handleSend"
          :disabled="!messageContent.trim()"
          class="send-button"
        >
          发送
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-input-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-selection {
  display: flex;
  justify-content: flex-start;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-area {
  background-color: #fafafa;
  border-radius: 8px;
  padding: 8px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
}

.send-button {
  min-width: 80px;
}
</style>