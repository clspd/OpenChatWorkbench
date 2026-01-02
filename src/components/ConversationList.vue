<template>
    <div class="message-list">
        <div v-if="conversationStore.loading" class="loading">Loading...</div>
        <div v-else-if="conversationGroups.length === 0" class="empty">
            No conversations
        </div>
        <div v-else class="conversation-groups">
            <div v-for="group in conversationGroups" :key="group.label" class="group">
                <div class="group-label">{{ group.label }}</div>
                <div v-for="conversation in group.conversations" :key="conversation.id" 
                    class="conversation-item"
                    :class="{ 'is-selected': isActive(conversation.id) }"
                    draggable="true"
                    @dragstart="handleDragStart(conversation.id, $event)"
                    @click="handleConversationClick(conversation.id)">
                    <div class="conversation-title">{{ conversation.title }}</div>
                    <div class="conversation-meta">
                        <span class="conversation-time">{{ formatConversationTime(conversation.updated_at) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
import { groupConversationsByTime, formatConversationTime } from '@/utils/conversationGroup'
import type { ConversationGroup } from '@/utils/conversationGroup'

const router = useRouter()
const route = useRoute()
const conversationStore = useConversationStore()
const emit = defineEmits(['initialized'])

const conversationGroups = computed<ConversationGroup[]>(() => {
    return groupConversationsByTime(conversationStore.sortedConversations)
})

const handleConversationClick = (conversationId: string) => {
    router.push(`/chat/c/${conversationId}`)
}

const handleDragStart = (conversationId: string, event: DragEvent) => {
    if (!event.dataTransfer) return
    event.dataTransfer.setData('text/plain', conversationStore.getConversationById(conversationId)?.title || 'Untitled')
    event.dataTransfer.setData('text/uri-list', new URL(router.resolve(`/chat/c/${conversationId}`).href, new URL(router.options.history.base, window.location.href)).href)
}

const isActive = (conversationId: string): boolean => {
    return route.params.chatId === conversationId
}

onMounted(async () => {
    await conversationStore.loadIndex()
    emit('initialized')
})
</script>

<style scoped>
.message-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2em;
    color: var(--text-secondary);
}

.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2em;
    color: var(--text-secondary);
}

.conversation-groups {
    flex: 1;
    overflow-y: auto;
    padding: 0.5em;
}

.group {
    margin-bottom: 1em;
}

.group-label {
    padding: 0.5em 0.75em;
    font-size: 0.85em;
    font-weight: 600;
    color: var(--text-secondary);
    background-color: var(--group-label-bg);
    border-radius: 0.25em;
}

.conversation-item {
    padding: 0.75em;
    margin-top: 0.25em;
    border-radius: 0.5em;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
    background-color: var(--app-message-list-conversation-item-bg);
    color: var(--app-message-list-conversation-item-text-color);
}

.conversation-item:hover {
    background-color: var(--app-message-list-conversation-hover-bg);
}

.conversation-item:active {
    background-color: var(--app-message-list-conversation-active-bg);
    color: var(--app-message-list-conversation-active-text-color);
}

.conversation-item.is-selected {
    background-color: var(--app-message-list-conversation-selected-bg);
    color: var(--app-message-list-conversation-selected-text-color);
}

.conversation-title {
    font-size: 0.9em;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.25em;
    font-size: 0.75em;
    color: var(--text-secondary);
}

.conversation-time {
    font-size: 0.75em;
    opacity: 0.8;
}
</style>
