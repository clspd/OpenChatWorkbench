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
                :ref="el => el && virtualizer.measureElement(el as HTMLElement)"
                :data-role="msgRoleIdentifyMap[chatFlow[vi.index]!.data.role]"
            >
                <MessageItem v-if="chatFlow[vi.index]"
                    :message="chatFlow[vi.index]!.data"
                    :show-raw="chatFlowPref[vi.index]?.showRaw"
                />
                <div v-else class="err-data-corrupted">Data corrupted</div>

                <MessageOperations v-if="chatFlow[vi.index] && chatFlow[vi.index]?.data.status === MessageStatus.Finished"
                    :message="chatFlow[vi.index]!.data"
                    :choice="getCurrentChoiceForId(chatFlow[vi.index]!.data.id)"
                    :total-choices="chatFlow[vi.index]!.choicesCount"
                    @update:choice="(choice) => updateChoice(chatFlow[vi.index]!.data.id, choice)"
                    @edit-message="handleRequestEditMessage(chatFlow[vi.index]!.data.id)"
                    @regenerate-message="handleRequestRegenerateMessage(chatFlow[vi.index]!.data.id)"
                    @like-message="(newState) => handleRequestLikeMessage(chatFlow[vi.index]!.data.id, newState)"
                    :show-raw-message="chatFlowPref[vi.index]?.showRaw"
                    @update:show-raw-message="(showRaw) => updateShowRawMessage(vi.index, showRaw)"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import { message } from 'ant-design-vue';
import { debounce, useVirtualizer } from '@tanstack/vue-virtual';
import { ConvertConversationToTree } from '@/modules/chat-tree/tree';
import { useConversationStore } from '@/stores/conversationStore';
import { FixChoiceChain, FlattenConversationTree, GetDefaultChoices, type FlatMessage } from '@/modules/chat-tree/flat';
import { useAppStateStore } from '@/stores/appState';
import { msgRoleIdentifyMap } from "@/modules/chat/msgRoleMap";
import MessageItem from '@/components/MessageItem.vue';
import MessageOperations from '@/components/MessageOperations.vue';
import { MessageFeedback, MessageStatus } from '@/types/message';
import { UpdateConversation } from '@/modules/chat/conversation';
import type { ConversationTreeContainer, ConversationTreeNode } from '@/types/chat-tree';
import { nextTick } from 'vue';

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
        if (!chatFlow.value.length) return;
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
const chatFlowComputingState = ref({
    last_computed_at: 0,
    computed_count: 0,
})
const chatFlow = ref<FlatMessage[]>([]);
//     computed(() => {
//     if (!tree.value) return [];
//     console.log('compute chatFlow with choices', props.choices.join(','))
//     const now = Date.now();
//     if (chatFlowComputingState.value.last_computed_at !== now) {
//         chatFlowComputingState.value.last_computed_at = now;
//         chatFlowComputingState.value.computed_count = 0;
//     }
//     else if (++chatFlowComputingState.value.computed_count > 10) {
//         throw new Error("Maximun 100 iterations reached! Application error")
//     }
//     try { return FlattenConversationTree(tree.value, props.choices) }
//     catch (e) {
//         const defaultChoices = GetDefaultChoices(tree.value);
//         if ((props.choices.join(',')) !== (defaultChoices.join(','))) {
//             message.warn("Invalid choices, reset to default choices.");
//             // console.trace(e)
//             nextTick(() => emit('update:choices', defaultChoices));
//         } else {
//             throw e;
//         }
//         return [];
//     }
// });
const updateChatFlow = () => {
    if (!tree.value) return;
    console.debug('compute chatFlow with choices', props.choices.join(','))
    try {
        chatFlow.value = FlattenConversationTree(tree.value, props.choices);
    } catch (e) {
        const defaultChoices = GetDefaultChoices(tree.value);
        if ((props.choices.join(',')) !== (defaultChoices.join(','))) {
            message.warn("Invalid choices, reset to default choices.");
            // console.trace(e)
            emit('update:choices', defaultChoices);
        } else {
            throw e;
        }
        return [];
    }
}
watch(() => props.choices, updateChatFlow, { immediate: true })
watch(() => tree.value, updateChatFlow)
const chatFlowPref = ref<Record<number, {
    showRaw: boolean;
}>>({});

const viewer = ref<HTMLDivElement>();
const contentContainerRef = ref<HTMLDivElement>()

const vOptions = computed(() => ({
    count: chatFlow.value.length,
    getScrollElement: () => (appState.mainContentViewEl as any)?.$el || null,
    estimateSize: () => 300,
    overscan: 10,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// const scheduledFlush = ref(new Set<HTMLElement>());
// const scheduleFlush = (el: HTMLElement) => {
//     scheduledFlush.value.add(el);
//     debounce(window, () => {
//         scheduledFlush.value.forEach((el) => {
//             virtualizer.value.measureElement(el);
//         })
//         scheduledFlush.value.clear();
//     }, 100);
// }

const updateShowRawMessage = (index: number, showRaw: boolean) => {
    if (chatFlowPref.value[index]) {
        chatFlowPref.value[index].showRaw = showRaw;
    } else {
        chatFlowPref.value[index] = {
            showRaw: showRaw,
        };
    }
}

const getIdxChoicePathIndex = (id: number) => {
    if (!tree.value) return -1;
    let nodes: ConversationTreeNode[] = tree.value.children, parent: ConversationTreeNode | null = null;

    for (let i = 0, l = props.choices.length; i < l; i++) {
        const c = props.choices[i]!;
        if (!nodes[c]?.children) return -1;
        parent = nodes[c];
        nodes = nodes[c].children;
        if (parent.id === id) return (i) >= l ? -1 : (i);
    }
    return -1;
}

const getCurrentChoiceForId = (id: number): number => {
    const c = getIdxChoicePathIndex(id);
    if (c === -1) return 0;
    const data = props.choices[c];
    if (!data) return 0;
    return data;
}

const updateChoice = (id: number, choice: number) => {
    const clone = Array.from(props.choices);
    const idx = getIdxChoicePathIndex(id);
    if (idx === -1 || !tree.value) return;
    clone[idx] = choice;
    if (idx > clone.length - 3) clone.splice(idx + 1);
    emit('update:choices', FixChoiceChain(tree.value, clone));
}

const handleRequestEditMessage = (id: number) => {
    
    
}

const handleRequestRegenerateMessage = (id: number) => {
    
    
}

const handleRequestLikeMessage = (id: number, newState: MessageFeedback) => {
    if (!conversation.value) return;
    const msg = conversation.value.messages.find((msg) => msg.id === id);
    if (!msg) return;
    msg.feedback = newState;
    conversationStore.updateConvInStore(props.chatId, conversation.value);
}

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
    overflow-wrap: anywhere;
    display: flex;
    flex-direction: column;
}
.vItem[data-role="user"] {
    align-items: flex-end;
}
.vItem[data-role="system"] > .message-operations {
    display: none;
}
.vItem + .vItem {
    margin-top: 1em;
}
</style>
