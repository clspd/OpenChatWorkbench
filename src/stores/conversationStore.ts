import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Conversation, ConversationGroup, ConversationIndex, ConversationIndexItem, PendingMessageRequest } from '@/types/conversation'
import { fs } from '@/userdata';
import { getChatIndexPath, getConvPath } from '@/modules/chat/path';
import { dumpConversationData } from '@/modules/chat/dumper';
import { groupConversationsByTime } from '@/utils/conversationGroup';

/**
 * Temporarily caches the conversation and message data.
 * TODO: Data should be automatically synced when updated
 */
export const useConversationStore = defineStore('conversation', {
    state: () => ({
        index: new Map<number, ConversationIndex>(),
        currentIndexId: 0,
        conversations: new Map<string, Conversation>(),
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

    getters: {
        integratedConversationsList(): { conversations: ConversationIndexItem[], has_more: boolean } {
            // merge all indexes
            const conversations: ConversationIndexItem[] = [];
            // loop starting from currentIndexId
            let i = this.currentIndexId;
            for (; i > 0; --i) {
                const item = this.index.get(i);
                if (!item) break; // we've reached the end of cached indexes
                for (const conv of item.conversations) {
                    conversations.push(conv); // add conversation to list
                }
            }
            // return integrated conversations list
            return {
                conversations,
                has_more: (i === 0) ? false : true,
            };
        },
        groupedConversationsList(): { groups: ConversationGroup[], has_more: boolean } {
            const data = this.integratedConversationsList;

            return {
                groups: groupConversationsByTime(data.conversations),
                has_more: data.has_more,
            };
        }
    }
})
