import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, ConversationIndex } from '@/types/conversation'

/**
 * Temporarily caches the conversation and message data.
 * TODO: Data should be automatically synced when updated
 */
export const useConversationStore = defineStore('conversation', {
    state: () => ({
        index: new Map<number, ConversationIndex>(),
        currentIndexId: 0,
        conversations: new Map<string, Conversation>(),
    }),
})
