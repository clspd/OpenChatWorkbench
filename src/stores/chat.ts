import { defineStore } from 'pinia'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  models: string[]
  selectedModel: string
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    models: ['GPT-4', 'GPT-3.5', 'Claude 3', 'Gemini 1.5'],
    selectedModel: 'GPT-4'
  }),

  getters: {
    activeConversation: (state) => {
      if (!state.activeConversationId) return null
      return state.conversations.find(conv => conv.id === state.activeConversationId) || null
    }
  },

  actions: {
    createConversation() {
      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        title: '新对话',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      this.conversations.push(newConversation)
      this.activeConversationId = newConversation.id
      return newConversation
    },

    sendMessage(content: string) {
      if (!this.activeConversationId) {
        this.createConversation()
      }

      const conversation = this.activeConversation
      if (!conversation) return

      const userMessage: Message = {
        id: `msg_${Date.now()}_user`,
        content,
        role: 'user',
        timestamp: new Date()
      }

      conversation.messages.push(userMessage)
      conversation.updatedAt = new Date()

      // 模拟AI响应
      setTimeout(() => {
        const aiMessage: Message = {
          id: `msg_${Date.now()}_assistant`,
          content: '这是一个预设的AI响应。我正在学习如何更好地回答您的问题。',
          role: 'assistant',
          timestamp: new Date()
        }
        conversation.messages.push(aiMessage)
        conversation.updatedAt = new Date()
      }, 500)
    },

    switchConversation(conversationId: string) {
      this.activeConversationId = conversationId
    },

    deleteConversation(conversationId: string) {
      const index = this.conversations.findIndex(conv => conv.id === conversationId)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        if (this.activeConversationId === conversationId) {
          this.activeConversationId = this.conversations.length > 0 ? this.conversations[0].id : null
        }
      }
    },

    setSelectedModel(model: string) {
      this.selectedModel = model
    }
  }
})