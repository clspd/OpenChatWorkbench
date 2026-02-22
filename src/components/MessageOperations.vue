<template>
    <div class="message-operations" :data-role="msgRoleIdentifyMap[props.message.role]">
        <div class="message-info">
            <div class="message-meta">
                <div class="message-sent">{{ sentAt }}</div>
                <div v-if="props.message.role === MessageRole.Assistant">·</div>
                <div class="message-model" v-if="props.message.role === MessageRole.Assistant">{{ props.message.model }}</div>
            </div>
            <a-button type="text" shape="circle" aria-label="Copy message" @click="copyMessage">
                <CopyOutlined v-if="!copiedTimer" />
                <CheckOutlined v-else />
            </a-button>
            <a-button type="text" shape="circle" aria-label="Toggle raw message" @click="emit('update:showRawMessage', !props.showRawMessage)" :disabled="isPending">
                <CompressOutlined v-if="!props.showRawMessage" />
                <ExpandOutlined v-else />
            </a-button>
            <a-button type="text" shape="circle" aria-label="Edit message" @click="emit('edit-message')" :disabled="props.disabled || isPending">
                <EditOutlined />
            </a-button>
            <a-button type="text" shape="circle" aria-label="Regenerate message" @click="emit('regenerate-message')" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                <RedoOutlined />
            </a-button>
            <a-button type="text" shape="circle" aria-label="Like message" @click="emit('like-message', currentLikeState === 1 ? MessageFeedback.NotProvided : MessageFeedback.Positive)" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                <LikeFilled v-if="currentLikeState === 1" />
                <LikeOutlined v-else />
            </a-button>
            <a-button type="text" shape="circle" aria-label="Dislike message" @click="emit('like-message', currentLikeState === -1 ? MessageFeedback.NotProvided : MessageFeedback.Negative)" v-if="props.message.role === MessageRole.Assistant" :disabled="props.disabled || isPending">
                <DislikeFilled v-if="currentLikeState === -1" />
                <DislikeOutlined v-else />
            </a-button>
            <a-dropdown trigger="click" position="top">
                <template #overlay>
                    <div class="message-details-box">
                        <div class="message-detail-item">
                            <div class="message-detail-label">Provider</div>
                            <div class="message-detail-value">{{ props.message.provider }}</div>
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
                    </div>
                </template>
                <a-button type="text" shape="circle" aria-label="More options">
                    <MoreOutlined />
                </a-button>
            </a-dropdown>
        </div>

        <div class="message-choices" v-if="props.totalChoices > 1">
            <a-button type="text" size="small" shape="circle" aria-label="Switch to previous choice" @click="choiceAction(1, -1)" :disabled="props.disabled || choice === 0">
                <LeftOutlined />
            </a-button>

            <a-button type="text" size="small" :aria-label="`Current choice: ${props.choice}; Total choices count: ${props.totalChoices}; click to switch choice`" @click="choiceAction(2)" :disabled="props.disabled">
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
import { CopyOutlined, CheckOutlined, EditOutlined, RedoOutlined, LikeOutlined, DislikeOutlined, CompressOutlined, ExpandOutlined, LeftOutlined, RightOutlined, LikeFilled, DislikeFilled, MoreOutlined } from '@ant-design/icons-vue';
import { MessageFeedback, MessageRole, MessageStatus, type Message } from '@/types/message';
import { message } from 'ant-design-vue';
import { ExtractMessageText } from '@/modules/chat/message';
import dayjs from 'dayjs';
import { msgRoleIdentifyMap } from '@/modules/chat/msgRoleMap';
import { prompt } from '@/utils/prompt';
import { useConversationStore } from '@/stores/conversationStore';

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
        message.error("Unable to copy message: " + e);
    }
}

const choiceAction = async (type: number, data?: number) => {
    if (type === 1 && data !== undefined) {
        const newPos = props.choice + data;
        if (newPos < 0 || newPos >= props.totalChoices) return;
        emit('update:choice', newPos);
    } else if (type === 2) {
        const newPos = await prompt("Please input new choice", "Switch branch", String(props.choice + 1), "number");
        if (newPos == null) return;
        if (Number.isNaN(Number(newPos)) || Number(newPos) < 1 || Number(newPos) > props.totalChoices) {
            message.error("Invalid choice index.");
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
.message-operations[data-role="user"] {
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
    padding: 0.5em;
    border: 1px solid #d9d9d9;
    background: var(--background, #fff);
    border-radius: 0.25em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    box-shadow: 0 0 0.25em rgba(0, 0, 0, 0.1);
}
.message-detail-item {
    display: flex;
    align-items: center;
}
.message-detail-label {
    font-weight: bold;
    margin-right: 0.5em;
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
