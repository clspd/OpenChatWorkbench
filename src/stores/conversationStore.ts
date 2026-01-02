import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getIndex } from '@/modules/chat/convIndex'
import type { ConversationIndex, ConversationIndexItem } from '@/types/index.ts'

export const useConversationStore = defineStore('conversation', {
    state: () => ({
        index: null as ConversationIndex | null,
        loading: false,
        error: null as string | null,
    }),

    getters: {
        conversations: (state): ConversationIndexItem[] => {
            return state.index?.conversations || []
        },

        hasConversations: (state): boolean => {
            if (!state.index || !state.index.conversations) return false
            return state.index.conversations.length > 0
        },

        sortedConversations: (state): ConversationIndexItem[] => {
            if (!state.index?.conversations) return []
            return [...state.index.conversations].sort((a, b) => b.updated_at - a.updated_at)
        },

        pinnedConversations: (state): ConversationIndexItem[] => {
            if (!state.index?.conversations) return []
            return state.index.conversations.filter(c => c.pinned).sort((a, b) => b.updated_at - a.updated_at)
        }
    },

    actions: {
        async loadIndex() {
            try {
                this.loading = true
                this.error = null
                this.index = await getIndex()
            } catch (error) {
                this.error = 'Failed to load conversations'
                console.error('Failed to load conversations:', error)
            } finally {
                this.loading = false
            }
        },

        async refresh() {
            await this.loadIndex()
        },

        addConversation(conversation: ConversationIndexItem) {
            if (!this.index) {
                this.index = {
                    schemaVersion: 1,
                    conversations: [],
                    has_more: false
                }
            }

            const existingIndex = this.index.conversations.findIndex(c => c.id === conversation.id)
            if (existingIndex !== -1) {
                this.index.conversations[existingIndex] = conversation
            } else {
                this.index.conversations.push(conversation)
            }
        },

        updateConversation(conversationId: string, updates: Partial<ConversationIndexItem>) {
            if (!this.index) return

            const index = this.index.conversations.findIndex(c => c.id === conversationId)
            if (index && index !== -1) {
                const conversation = this.index.conversations[index]
                if (conversation) {
                    Object.assign(conversation, updates);
                }
            }
        },

        removeConversation(conversationId: string) {
            if (!this.index) return

            this.index.conversations = this.index.conversations.filter(c => c.id !== conversationId)
        },

        updatePinnedStatus(conversationId: string, pinned: boolean) {
            this.updateConversation(conversationId, { pinned })
        },

        getConversationById(conversationId: string): ConversationIndexItem | undefined {
            return this.index?.conversations.find(c => c.id === conversationId)
        }
    }
})
