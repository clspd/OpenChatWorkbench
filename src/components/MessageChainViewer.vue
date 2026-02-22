<template>
    <div class="message-chain-viewer" ref="viewer" :class="{'empty': chatFlow.length === 0}">
        <div v-if="chatFlow.length === 0">
            <a-empty :description="t('chat:messageChain.emptyState')" />
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
                <div v-else class="err-data-corrupted">{{ t('chat:messageChain.error.dataCorrupted') }}</div>

                <MessageOperations v-if="chatFlow[vi.index]"
                    :message="chatFlow[vi.index]!.data" :convId="props.chatId"
                    :choice="getCurrentChoiceForId(chatFlow[vi.index]!.data.id)"
                    :total-choices="chatFlow[vi.index]!.choicesCount"
                    :disabled="props.disabled"
                    @update:choice="(choice) => updateChoice(chatFlow[vi.index]!.data.id, choice)"
                    @edit-message="handleRequestEditMessage(chatFlow[vi.index]!.data.id)"
                    @regenerate-message="handleRequestRegenerateMessage(chatFlow[vi.index]!.data.id)"
                    @like-message="(newState) => handleRequestLikeMessage(chatFlow[vi.index]!.data.id, newState)"
                    :show-raw-message="chatFlowPref[vi.index]?.showRaw"
                    @update:show-raw-message="(showRaw) => updateShowRawMessage(vi.index, showRaw)"
                />
            </div>
        </div>

        <DialogView c_if="contentEditDlgState.show" v-model="contentEditDlgState.show" class="fragment-editor">
            <template #title>{{ t('chat:messageChain.editDialog.title', { id: contentEditDlgState.msgId }) }}</template>
            <div v-for="(frag, idx) in contentEditDlgState.frag" :key="idx" class="fragment">
                <div class="fragment-edit-title">Fragment {{frag.id}} <a href="javascript:" class="fragment-btn-delete" @click="contentEditDlgState.frag.splice(idx, 1)">Delete fragment</a></div>
                <a-textarea v-if="frag.contentType === MessageContentType.Text"
                    auto-size
                    v-model:value="frag.content" />
                <div v-else>{{ t('chat:messageChain.editDialog.fragment.cannotEdit') }}</div>
            </div>
            <div style="flex: 1;"></div>
            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 0.5em;">
                    <a-button type="primary" @click="handleSaveEdit">{{ t('chat:messageChain.editDialog.buttons.save') }}</a-button>
                    <a-button @click="contentEditDlgState.show = false">{{ t('chat:messageChain.editDialog.buttons.cancel') }}</a-button>
                </div>
            </template>
        </DialogView>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';
import { message } from 'ant-design-vue';
import { cloneDeep } from 'lodash-es';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { t } from 'i18next';
import { ConvertConversationToTree } from '@/modules/chat-tree/tree';
import { useConversationStore } from '@/stores/conversationStore';
import { FixChoiceChain, FlattenConversationTree, GetDefaultChoices, type FlatMessage } from '@/modules/chat-tree/flat';
import { useAppStateStore } from '@/stores/appState';
import { msgRoleIdentifyMap } from "@/modules/chat/msgRoleMap";
import MessageItem from '@/components/MessageItem.vue';
import MessageOperations from '@/components/MessageOperations.vue';
import { MessageContentType, MessageFeedback, MessageFragmentType, MessageRole, type MessageFragment } from '@/types/message';
import type { ConversationTreeNode } from '@/types/chat-tree';
import { DialogView } from 'vue-dialog-view';

const props = defineProps<{
    chatId: string;
    choices: number[];
    disabled?: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:choices', choices: number[]): void;
    (e: 'request-regenerate', id: number, parent_id: number, newChoices: number[]): void;
    (e: 'request-edit', id: number, parent_id: number | null, newChoices: number[]): void;
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
        return virtualizer.value
    },
});

const appState = useAppStateStore()

const conversationStore = useConversationStore()
const conversation = computed(() => conversationStore.getConvFromStore(props.chatId));

const tree = computed(() => conversation.value && ConvertConversationToTree(conversation.value));
const chatFlow = ref<FlatMessage[]>([]);
const updateChatFlow = () => {
    if (!tree.value) return;
    if (props.choices.length === 0) return;
    // console.debug('compute chatFlow with choices', props.choices.join(','))
    try {
        chatFlow.value = FlattenConversationTree(tree.value, props.choices);
    } catch (e) {
        const defaultChoices = GetDefaultChoices(tree.value);
        if ((props.choices.join(',')) !== (defaultChoices.join(','))) {
            message.warn(t('chat:messageChain.warnings.invalidChoices'));
            console.trace(e)
            emit('update:choices', defaultChoices);
        } else {
            throw e;
        }
        return [];
    }
}
watch(() => props.choices, updateChatFlow, { immediate: true, deep: true })
// watch(() => tree.value, updateChatFlow)
const chatFlowPref = ref<Record<number, {
    showRaw: boolean;
}>>({});

const viewer = ref<HTMLDivElement>();
const contentContainerRef = ref<HTMLDivElement>()
const isSafari = /safari/i.test(navigator.userAgent) && (!/chrom|crios|edg|opr|brave/i.test(navigator.userAgent));

const vOptions = computed(() => ({
    count: chatFlow.value.length,
    getScrollElement: () => (appState.mainContentViewEl as any)?.$el || null,
    estimateSize: () => 3000,
    overscan: 5,
    useScrollendEvent: !isSafari,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

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

const truncateChoicesToId = (idx: number) => {
    const clone = Array.from(props.choices);
    return clone.splice(0, idx + 1);
}

const updateChoice = (id: number, choice: number) => {
    const idx = getIdxChoicePathIndex(id);
    if (idx === -1) return;
    const clone = truncateChoicesToId(idx);
    if (!clone || !tree.value) return;
    clone[idx] = choice;
    emit('update:choices', FixChoiceChain(tree.value, clone));
}

const handleModifyMessage = (id: number, type: ('regenerate' | 'edit')) => { 
    const idx = getIdxChoicePathIndex(id);
    if (idx === -1) return null;
    const clone = truncateChoicesToId(idx);
    if (!clone || !tree.value) return;
    clone.splice(clone.length - 1, 1, chatFlow.value.find((msg) => msg.data.id === id)?.choicesCount || 0);
    // create new request
    const parent_id = conversation.value?.messages.find((msg) => msg.id === id)?.parent_id ?? null
    if (null == parent_id && type === 'regenerate') return message.error(t('chat:messageChain.error.cannotRegenerate'))
    if (type === 'regenerate') emit("request-regenerate", id, parent_id!, clone);
    else emit("request-edit", id, parent_id, clone);
}

const contentEditDlgState = reactive({
    show: false,
    msgId: 0,
    frag: [] as MessageFragment[],
})
const handleRequestEditMessage = (id: number) => {
    const data = conversation.value?.messages.find((msg) => msg.id === id);
    if (!data) return message.error(t('chat:messageChain.error.cannotEdit'))
    if (data.role === MessageRole.User) handleModifyMessage(id, 'edit');
    else {
        contentEditDlgState.msgId = id;
        contentEditDlgState.frag = cloneDeep(toRaw(data.fragments));
        contentEditDlgState.show = true;
    }
}

const handleRequestRegenerateMessage = (id: number) => {
    handleModifyMessage(id, 'regenerate');
}

const handleRequestLikeMessage = (id: number, newState: MessageFeedback) => {
    if (!conversation.value) return;
    const msg = conversation.value.messages.find((msg) => msg.id === id);
    if (!msg) return;
    msg.feedback = newState;
    conversationStore.updateConvInStore(props.chatId, conversation.value);
}

const handleSaveEdit = async () => {
    if (!contentEditDlgState.show) return;
    const msg = conversation.value?.messages.find((msg) => msg.id === contentEditDlgState.msgId);
    if (!msg) return message.error(t('chat:messageChain.error.cannotEdit'))
    msg.fragments = contentEditDlgState.frag;
    conversationStore.updateConvInStore(props.chatId, conversation.value);
    contentEditDlgState.show = false;
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
.fragment-editor {
    width: 100%;
    height: 100%;
}
.fragment-editor .fragment {
    margin-bottom: 1em;
}
.fragment-editor .fragment-btn-delete {
    color: red;
    font-size: small;
    margin-left: 1em;
}
</style>
