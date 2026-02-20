<template>
    <div class="message-chain-viewer" ref="viewer" :class="{'empty': chatFlow.length === 0}">
        <div v-if="chatFlow.length === 0">
            <a-empty description="No message" />
        </div>
        <div v-else class="content-container" ref="contentContainerRef">
            <div :style="{ height: totalSize + 'px' }"></div>
            <div v-for="vi in virtualItems" :key="vi.index"
                class="vItem" :data-index="vi.index"
                :style="{ top: vi.start + 'px' }"
                :ref="el => { if (el) virtualizer.measureElement(el as Element) }"
            >
                <MessageItem v-if="chatFlow[vi.index]"
                    :message="chatFlow[vi.index]!"
                />
                <div v-else class="err-data-corrupted">Data corrupted</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { ConvertConversationToTree } from '@/modules/chat-tree/tree';
import { useConversationStore } from '@/stores/conversationStore';
import { FlattenConversationTree, GetDefaultChoices } from '@/modules/chat-tree/flat';
import MessageItem from '@/components/MessageItem.vue';
import { useAppStateStore } from '@/stores/appState';

const props = defineProps<{
    chatId: string;
    // conversation: Conversation;
    choices: number[];
}>();

const emit = defineEmits<{
    (e: 'update:choices', choices: number[]): void;
}>();

defineExpose({
    scrollToBottom() {
        virtualizer.value.scrollToIndex(chatFlow.value.length - 1);
        ((appState.mainContentViewEl as any).$el as HTMLElement).scrollTo({
            top: ((appState.mainContentViewEl as any).$el as HTMLElement).scrollHeight,
            behavior: 'smooth',
        });
    },
    requestChatFlowData() {
        return chatFlow.value
    },
    getVirtualizer() {
        return virtualizer.value;
    },
});

const appState = useAppStateStore()

const conversationStore = useConversationStore()
const conversation = computed(() => conversationStore.getConvFromStore(props.chatId));

const tree = computed(() => conversation.value && ConvertConversationToTree(conversation.value));
const chatFlow = computed(() => {
    if (!tree.value) return [];
    try { return FlattenConversationTree(tree.value, props.choices) }
    catch {
        emit('update:choices', GetDefaultChoices(tree.value));
        return [];
    }
});

const viewer = ref<HTMLDivElement>();
const contentContainerRef = ref<HTMLDivElement>()

const vOptions = computed(() => ({
    count: chatFlow.value.length,
    getScrollElement: () => (appState.mainContentViewEl as any)?.$el || null,
    estimateSize: () => 200,
    overscan: 5,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

</script>

<style scoped>
.message-chain-viewer {
    position: relative;
}
.message-chain-viewer.empty {
    flex: 1;
    display: flex;
}
.message-chain-viewer.empty > div {
    margin: auto;
}
.content-container {
    padding: 1em;
    max-width: calc(50rem + 2em);
    margin: auto;
}
.vItem {
    position: absolute;
    width: calc(100% - 2em);
    box-sizing: border-box;
    max-width: calc(50rem);
    /* white-space: pre-wrap; */
    overflow-wrap: anywhere;
}
</style>
