<template>
    <div class="message-list" ref="msgList">
        <div v-if="props.type === 'workspace'">Workspace not implemented!!!</div>
        <div v-if="conversationGroupsData.groups.length === 0" class="empty">
            <a-empty />
        </div>
        <div v-else class="conversation-vlist-wrapper">
            <div v-for="vi in virtualItems" :key="vi.index" class="vItem" :data-index="vi.index" :style="{ top: vi.start + 'px' }" :ref="el => { if (el) virtualizer.measureElement(el as Element) }">
                <div :data-index="vi.index" v-if="flattenedConversations[vi.index]?.type === 'text-mark'" class="group-label">{{ (flattenedConversations[vi.index] as FlattenedConversationIndexItemTextMark).content }}</div>
                <a :data-index="vi.index" v-else-if="flattenedConversations[vi.index]?.type === 'conversation'"
                    class="conversation-item"
                    :class="{ 'is-selected': isActive((flattenedConversations[vi.index] as FlattenedConversationIndexItemConversation).content.id) }"
                    role="link"
                    :href="getConversationUrl((flattenedConversations[vi.index] as FlattenedConversationIndexItemConversation).content.id)"
                    @click="handleConversationClick((flattenedConversations[vi.index] as FlattenedConversationIndexItemConversation).content.id)">
                    <div class="conversation-title">{{ (flattenedConversations[vi.index] as FlattenedConversationIndexItemConversation).content.title }}</div>
                    <div class="conversation-meta">
                        <span class="conversation-time">{{ formatConversationTime((flattenedConversations[vi.index] as FlattenedConversationIndexItemConversation).content.updated_at) }}</span>
                    </div>
                </a>
                <div :data-index="vi.index" v-else-if="flattenedConversations[vi.index]?.type === 'has-more-mark'" class="has-more-mark">
                    Has more data (TODO: load these data...)
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConversationStore } from '@/stores/conversationStore'
import { formatConversationTime } from '@/utils/conversationGroup'
import { useWindowStateStore } from '@/stores/windowState'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { ConversationIndexItem, FlattenedConversationIndexItem, FlattenedConversationIndexItemConversation, FlattenedConversationIndexItemTextMark } from '@/types/conversation'

const router = useRouter()
const route = useRoute()
const conversationStore = useConversationStore()
const props = defineProps({
    type: {
        type: String,
        default: 'chat'
    },
})
const emit = defineEmits(['initialized'])

const conversationGroupsData = computed(() => {
    return conversationStore.groupedConversationsList
});
const flattenedConversations = computed<FlattenedConversationIndexItem[]>(() => {
    const result: FlattenedConversationIndexItem[] = []
    for (const i of conversationGroupsData.value.groups) {
        result.push({ type: "text-mark", content: i.label })
        for (const j of i.conversations) {
            result.push({ type: "conversation", content: j })
        }
    }
    if (conversationGroupsData.value.has_more) {
        result.push({ type: "has-more-mark" })
    }
    return result
});

const msgList = ref<HTMLDivElement>();
const fontSizeMeasurer = ref<HTMLDivElement>();
const measure1em = () => fontSizeMeasurer.value && parseFloat(window.getComputedStyle(fontSizeMeasurer.value).fontSize);

const vOptions = computed(() => ({
    count: flattenedConversations.value.length,
    getScrollElement: () => msgList.value?.parentElement || null,
    estimateSize: () => 52.625,
    overscan: 10,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

const handleConversationClick = (conversationId: string) => {
    router.push(`/chat/c/${conversationId}`)
    if (!useWindowStateStore().isLargeScreen) {
        useAppStatePersistStore().sidebarCollapsed = true
    }
}

const getConversationUrl = (conversationId: string): string => {
    return new URL(router.resolve(`/chat/c/${conversationId}`).href, new URL(router.options.history.base, window.location.href)).href
}

const isActive = (conversationId: string): boolean => {
    return route.params.chatId === conversationId
}

onMounted(async () => {
    // await conversationStore.loadIndex()
    emit('initialized')
})
</script>

<style scoped>
/* .message-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
} */

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

.vItem {
    position: absolute;
    width: calc(100% - 1em);
    box-sizing: border-box;
}

.conversation-vlist-wrapper {
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
    display: block;
    padding: 0.75em;
    margin-top: 0.25em;
    border-radius: 0.5em;
    cursor: pointer;
    text-decoration: none !important;
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

.conversation-item:focus-visible {
    outline: 2px solid var(--app-message-list-conversation-focus-outline);
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
