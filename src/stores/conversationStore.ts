import { defineStore } from 'pinia'
import type { Conversation, ConversationGroup, ConversationIndex, ConversationIndexItem, ConversationUserPref, PendingMessageRequest } from '@/types/conversation'
import { fs } from '@/userdata';
import { getAttachmentIndexPath, getChatIndexPath, getConvPath } from '@/modules/chat/path';
import { dumpConversationData } from '@/modules/chat/dumper';
import { groupConversationsByTime } from '@/utils/conversationGroup';
import { LoadConversationPreference, UpdateConversationPreferenceInternal } from '@/modules/chat/convPref';
import type { FileAttachmentInfo } from '@/types/message';
import { SaveAttachmentIndex } from '@/modules/chat/attachment';
import { writeFileQueued } from '@/utils/writeFileQueued';

/**
 * Temporarily caches the conversation and message data.
 */
export const useConversationStore = defineStore('conversation', {
    state: () => ({
        index: new Map<number, ConversationIndex>(),
        currentIndexId: 0,
        conversations: new Map<string, Conversation>(),
        preferences: new Map<string, ConversationUserPref>(),
        requestsInProgress: new Map<string, PendingMessageRequest>(),
        attaIndexCurrentId: 0,
        attachmentsIndex: new Map<string, FileAttachmentInfo>(),
    }),

    actions: {
        getConvFromStore(convId: string) {
            return this.conversations.get(convId);
        },
        addConvToStore(convId: string, conv: Conversation) {
            this.conversations.set(convId, conv);
        },
        async updateConvInStore(convId: string, conv?: Conversation, partialUpdate = false) {
            if (conv) {
                if (partialUpdate) {
                    const idData = this.conversations.get(convId);
                    if (!idData) throw new Error('Conversation specified by ID is not in store.');
                    Object.assign(idData, conv);
                } else {
                    this.conversations.set(convId, conv);
                }
                await writeFileQueued(getConvPath(convId), dumpConversationData(conv));
            }
            else {
                const idData = this.conversations.get(convId);
                if (!idData) throw new Error('Conversation specified by ID is not in store.');
                await writeFileQueued(getConvPath(convId), dumpConversationData(idData));
            }
        },
        removeConvFromStore(convId: string) {
            this.conversations.delete(convId);
            this.requestsInProgress.delete(convId);
        },
        async saveConvIndex(indexId: number) {
            await fs.writeFile(getChatIndexPath(indexId), new TextEncoder().encode(JSON.stringify(this.index.get(indexId))));
        },
        async loadPref(convId: string) {
            const pref = await LoadConversationPreference(convId);
            this.preferences.set(convId, pref);
            return pref;
        },
        async getPref(convId: string) {
            return this.preferences.get(convId) ?? this.loadPref(convId);
        },
        async updatePref(convId: string, pref: ConversationUserPref) {
            this.preferences.set(convId, pref);
            await UpdateConversationPreferenceInternal(convId, pref);
        },
        removePrefFromStore(convId: string) {
            this.preferences.delete(convId);
        },
        hasPendingMessage(convId: string) {
            return this.requestsInProgress.has(convId);
        },
        async setAttachmentIndex(hash: string, info: FileAttachmentInfo) {
            this.attachmentsIndex.set(hash, info);
            await SaveAttachmentIndex();
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
        },
    }
})
