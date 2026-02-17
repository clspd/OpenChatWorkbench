import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, ConversationIndex, PendingMessageRequest } from '@/types/conversation'
import { fs } from '@/userdata';
import { getChatIndexPath, getConvPath } from '@/modules/chat/path';
import { dumpConversationData } from '@/modules/chat/dumper';

/**
 * Temporarily caches the conversation and message data.
 * TODO: Data should be automatically synced when updated
 */
export const useConversationStore = defineStore('conversation', {
    state: () => ({
        index: new Map<number, ConversationIndex>(),
        currentIndexId: 0,
        conversations: new Map<string, Conversation>(),
        // cancellationTokens: new Map<string, AbortController>(),
        requestsInProgress: new Map<string, PendingMessageRequest>(),
    }),

    actions: {
        getConvFromStore(convId: string) {
            return this.conversations.get(convId);
        },
        addConvToStore(convId: string, conv: Conversation) {
            this.conversations.set(convId, conv);
        },
        async updateConvInStore(convId: string, conv?: Conversation) {
            if (conv) {
                this.conversations.set(convId, conv);
                await fs.writeFile(getConvPath(convId), dumpConversationData(conv));
            }
            else {
                const idData = this.conversations.get(convId);
                if (!idData) throw new Error('Conversation specified by ID is not in store.');
                await fs.writeFile(getConvPath(convId), dumpConversationData(idData));
            }
        },
        async saveConvIndex(indexId: number) {
            await fs.writeFile(getChatIndexPath(indexId), new TextEncoder().encode(JSON.stringify(this.index.get(indexId))));
        },
    },
})
