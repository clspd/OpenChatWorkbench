<template>
    <div class="message-list">
        <div v-if="conversationStore.loading" class="loading">加载中...</div>
        <div v-else-if="conversationGroups.length === 0" class="empty">暂无对话</div>
        <div v-else class="conversation-groups">
            <div v-for="group in conversationGroups" :key="group.label" class="group">
                <div class="group-label">{{ group.label }}</div>
                <div v-for="conversation in group.conversations" :key="conversation.id" 
                    class="conversation-item"
                    :class="{ 'pinned': conversation.pinned, 'active': isActive(conversation.id) }"
                    @click="handleConversationClick(conversation.id)">
                    <div class="conversation-title">{{ conversation.title }}</div>
                    <div class="conversation-meta">
                        <span v-if="conversation.pinned" class="pinned-icon">📌</span>
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

const conversationGroups = computed<ConversationGroup[]>(() => {
    return groupConversationsByTime(conversationStore.sortedConversations)
})

const handleConversationClick = (conversationId: string) => {
    router.push(`/chat/c/${conversationId}`)
}

const isActive = (conversationId: string): boolean => {
    return route.params.chatId === conversationId
}

onMounted(async () => {
    await conversationStore.loadIndex()
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
}

.conversation-item:hover {
    background-color: var(--conversation-hover-bg);
}

.conversation-item.active {
    background-color: var(--conversation-active-bg);
    border-color: var(--conversation-active-border);
}

.conversation-item.pinned {
    background-color: var(--conversation-pinned-bg);
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

.pinned-icon {
    margin-right: 0.25em;
}

.conversation-time {
    font-size: 0.75em;
    opacity: 0.8;
}
</style>
