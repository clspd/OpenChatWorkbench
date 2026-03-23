<template>
    <div class="message-operations" :data-role="msgRoleIdentifyMap[props.message.role]">
        <div v-if="props.message.role === MessageRole.User || props.message.role === MessageRole.System" style="flex: 1;"></div>
        <div class="message-info">
            <div class="message-meta">
                <div class="message-sent">{{ sentAt }}</div>
                <div v-if="props.message.role === MessageRole.Assistant">·</div>
                <div class="message-model" v-if="props.message.role === MessageRole.Assistant">{{ props.message.model }}</div>
            </div>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.copy') }}</template>
                <a-button type="text" shape="circle" aria-label="Copy message" @click="copyMessage">
                    <CopyOutlined v-if="!copiedTimer" />
                    <CheckOutlined v-else />
                </a-button>
            </a-tooltip>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.showRaw') }}</template>
                <a-button type="text" shape="circle" aria-label="Toggle raw message" @click="emit('update:showRawMessage', !props.showRawMessage)">
                    <CompressOutlined v-if="!props.showRawMessage" />
                    <ExpandOutlined v-else />
                </a-button>
            </a-tooltip>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.edit') }}</template>
                <a-button type="text" shape="circle" aria-label="Edit message" @click="emit('edit-message')" :disabled="props.disabled || isPending">
                    <EditOutlined />
                </a-button>
            </a-tooltip>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.regenerate') }}</template>
                <a-button type="text" shape="circle" aria-label="Regenerate message" @click="emit('regenerate-message')" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                    <RedoOutlined />
                </a-button>
            </a-tooltip>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.like') }}</template>
                <a-button type="text" shape="circle" aria-label="Like message" @click="emit('like-message', currentLikeState === 1 ? MessageFeedback.NotProvided : MessageFeedback.Positive)" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                    <LikeFilled v-if="currentLikeState === 1" />
                    <LikeOutlined v-else />
                </a-button>
            </a-tooltip>
            <a-tooltip>
                <template #title>{{ t('chat:messageOperations.dislike') }}</template>
                <a-button type="text" shape="circle" aria-label="Dislike message" @click="emit('like-message', currentLikeState === -1 ? MessageFeedback.NotProvided : MessageFeedback.Negative)" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                    <DislikeFilled v-if="currentLikeState === -1" />
                    <DislikeOutlined v-else />
                </a-button>
            </a-tooltip>
            <a-dropdown trigger="click" position="top" v-if="props.message.role === MessageRole.Assistant || props.showRawMessage">
                <template #overlay>
                    <div class="message-details-box">
                        <div class="message-detail-item">
                            <div class="message-detail-label">Message ID</div>
                            <div class="message-detail-value">{{ props.message.id }}</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Parent node</div>
                            <div class="message-detail-value">{{ props.message.parent_id ?? 'null' }}</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Provider</div>
                            <div class="message-detail-value">{{ props.message.providerName }}</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Model</div>
                            <div class="message-detail-value">{{ props.message.model }}</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Features</div>
                            <div class="message-detail-value">
                                <div v-for="(feature, idx) in props.message.features" :key="idx">
                                    {{ feature.type }}: {{ feature.value }}
                                </div>
                            </div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Time</div>
                            <div class="message-detail-value">{{ new Date(props.message.ts).toLocaleString() }}</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Elapsed</div>
                            <div class="message-detail-value">{{ computeTotalElapsed(props.message) }}ms</div>
                        </div>
                        <div class="message-detail-item" v-if="props.message.fragments[0]?.first_token_latency">
                            <div class="message-detail-label">First token latency</div>
                            <div class="message-detail-value">{{ props.message.fragments[0].first_token_latency }}ms</div>
                        </div>
                        <div class="message-detail-item">
                            <div class="message-detail-label">Status</div>
                            <div class="message-detail-value">{{ props.message.status }}</div>
                        </div>
                        <div class="message-detail-item" v-if="canForceStop">
                            <div class="message-detail-value"><a href="javascript:" @click.prevent="doForceStop">Force stop</a></div>
                        </div>
                    </div>
                </template>
                <a-tooltip>
                    <template #title>{{ t('chat:messageOperations.more') }}</template>
                    <a-button type="text" shape="circle" aria-label="More options">
                        <MoreOutlined />
                    </a-button>
                </a-tooltip>
            </a-dropdown>
        </div>

        <div class="message-choices" v-if="props.totalChoices > 1">
            <a-button type="text" size="small" shape="circle" aria-label="Switch to previous choice" @click="choiceAction(1, -1)" :disabled="props.disabled || choice === 0">
                <LeftOutlined />
            </a-button>

            <a-button type="text" size="small" :aria-label="`Current choice: ${props.choice + 1}; Total choices count: ${props.totalChoices}; click to switch choice`" @click="choiceAction(2)" :disabled="props.disabled">
                {{ props.choice + 1 }} / {{ props.totalChoices }}
            </a-button>

            <a-button type="text" size="small" shape="circle" aria-label="Switch to next choice" @click="choiceAction(1, 1)" :disabled="props.disabled || choice === props.totalChoices - 1">
                <RightOutlined />
            </a-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { message } from 'ant-design-vue';
import { CopyOutlined, CheckOutlined, EditOutlined, RedoOutlined, LikeOutlined, DislikeOutlined, CompressOutlined, ExpandOutlined, LeftOutlined, RightOutlined, LikeFilled, DislikeFilled, MoreOutlined } from '@ant-design/icons-vue';
import dayjs from 'dayjs';
import { t } from 'i18next';
import { MessageFeedback, MessageRole, MessageStatus, type Message } from '@/types/message';
import { ExtractMessageText } from '@/modules/chat/message';
import { msgRoleIdentifyMap } from '@/modules/chat/msgRoleMap';
import { prompt } from '@/utils/prompt';
import { useConversationStore } from '@/stores/conversationStore';
import { LoadConversation } from '@/modules/chat/conversation';

const props = defineProps<{
    convId: string;
    message: Message;
    choice: number;
    totalChoices: number;
    showRawMessage?: boolean;
    disabled?: boolean;
}>();

const emit = defineEmits<{
    (e: 'edit-message'): void;
    (e: 'regenerate-message'): void;
    (e: 'like-message', like: MessageFeedback): void;
    (e: 'update:choice', choice: number): void;
    (e: 'update:showRawMessage', showRawMessage: boolean): void;
}>();

const conversationStore = useConversationStore();

const isPending = computed(() => {
    return props.message.status === MessageStatus.WIP || conversationStore.hasPendingMessage(props.convId);
});

const sentAt = computed(() => {
    return dayjs(props.message.ts).format('HH:mm:ss');
})

const copiedTimer = ref<ReturnType<typeof setTimeout>>();
const copyMessage = async () => {
    try {
        await navigator.clipboard.writeText(ExtractMessageText(props.message));

        if (copiedTimer.value) clearTimeout(copiedTimer.value);
        copiedTimer.value = setTimeout(() => {
            copiedTimer.value = undefined;
        }, 1000);
    } catch (e) {
        message.error(t("chat:messageOperations.errors.copy") + e);
    }
}

const choiceAction = async (type: number, data?: number) => {
    if (type === 1 && data !== undefined) {
        const newPos = props.choice + data;
        if (newPos < 0 || newPos >= props.totalChoices) return;
        emit('update:choice', newPos);
    } else if (type === 2) {
        const newPos = await prompt(
            t('chat:messageChain.switchBranch.content'),
            t('chat:messageChain.switchBranch.title'),
            String(props.choice + 1), "number");
        if (newPos == null) return;
        if (Number.isNaN(Number(newPos)) || Number(newPos) < 1 || Number(newPos) > props.totalChoices) {
            message.error(t('chat:messageChain.switchBranch.invalidChoices'));
            return;
        }
        emit('update:choice', Number(newPos) - 1);
        // TODO: show a more beautiful choice switch dialog
    }
}

const currentLikeState = computed(() => (
    props.message.feedback === MessageFeedback.Positive ? 1 :
        (props.message.feedback === MessageFeedback.Negative ? -1 : 0))
);

const computeTotalElapsed = (msg: Message) => {
    let total = 0n;
    for (const i of msg.fragments) {
        total += BigInt(String(i.elapsed ?? 0));
        if (i.first_token_latency) total += BigInt(String(i.first_token_latency));
    }
    return total;
}

const canForceStop = computed(() => {
    return props.message.status === MessageStatus.WIP && !conversationStore.hasPendingMessage(props.convId);
});

const doForceStop = async () => {
    try {
        const conv = await LoadConversation(props.convId);
        if (!conv) return;
        const msg = conv.messages.find(m => m.id === props.message.id);
        if (!msg) return;
        msg.status = MessageStatus.Error;
        msg.has_pending_fragment = false;
        conversationStore.updateConvInStore(props.convId, conv);
    } catch (e) {
        message.error(t("chat:messageOperations.errors.fstop") + e);
    }
}


</script>

<style scoped>
.message-operations {
    margin-top: 0.25em;
    display: flex;
    align-items: center;
    white-space: nowrap;
    flex-wrap: wrap;
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 0.5em;
}
.message-operations[data-role="user"], .message-operations[data-role="system"] {
    flex-direction: row;
    justify-content: flex-start;
}
.message-info {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    overflow: hidden;
}
.message-info > button {
    color: gray;
    vertical-align: middle;
    display: flex;
}
.message-info > button > * {
    margin: auto;
}
.message-meta {
    font-size: 0.8em;
    color: gray;
    display: flex;
    overflow: auto;
}
.message-meta > * {
    margin-right: 0.5em;
}
.message-details-box {
    padding: 1em;
    border: 1px solid #d9d9d9;
    background: var(--background, #fff);
    border-radius: 0.5em;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 2em rgba(0, 0, 0, 0.1);
    max-width: calc(100vw - 4em);
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
}
.message-detail-item {
    display: flex;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
}
.message-detail-label {
    font-weight: bold;
    margin-right: 0.5em;
}
.message-detail-value {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: pre;
}
.message-choices {
    color: gray;
    display: flex;
    align-items: center;
}
.message-choices > button {
    color: gray;
    font-size: 0.85em;
}
.message-operations button[disabled] {
    color: #d9d9d9;
}
</style>
