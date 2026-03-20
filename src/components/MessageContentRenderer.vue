<template>
    <div class="message-content" :data-role="msgRoleMap[props.message.role]">
        <div v-if="hasThinkingFrag" class="thinking-tip-text" tabindex="0" @click="toggleThoughtContent" @keydown.enter="toggleThoughtContent" role="button">
            <span>{{ props.message.status === MessageStatus.WIP ? t('chat:messageChain.thinking.wip') : t('chat:messageChain.thinking.done', { duration: (totalThought) / 1000 }) }}</span>
            <DownOutlined class="icon" :data-state="collapseThoughtContent" />
        </div>
        <template v-for="(frag, index) in props.message.fragments" :key="index">
            <div
                v-if="frag.contentType === MessageContentType.Text"
                v-show="!!frag.content && ((frag.type === MessageFragmentType.Think || frag.type === MessageFragmentType.Tool) ? (!collapseThoughtContent) : true)"
                class="fragment-text-viewer"
                :data-type="fragTypeIdentifyMap[frag.type]"
            >
                <div v-if="frag.type === MessageFragmentType.Error" class="error-tip-text">
                    An error has occurred. See the details below for more information.
                </div>
                <MarkdownRenderer 
                    :content="frag.content" 
                    :mode="getMarkdownMode()"
                    :disabled="frag.type === MessageFragmentType.Error || props.showRaw"
                />
            </div>
            <div v-else class="err-not-supported">
                The content type of this fragment is not supported
            </div>
        </template>
        <div v-if="props.message.status === MessageStatus.WIP || props.message.has_pending_fragment" class="wip-tip-text">
            <LoadingOutlined class="spin" />
        </div>
        <div v-else-if="props.message.fragments.length === 0" class="empty-message">
            This message is empty.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { MessageContentType, MessageFragmentType, MessageRole, MessageStatus, type Message } from '@/types/message';
import { LoadingOutlined } from '@ant-design/icons-vue';
import { useAppStatePersistStore } from '@/stores/appStatePersist';

const appStatePersist = useAppStatePersistStore();

const props = defineProps<{
    message: Message;
    showRaw?: boolean;
}>();

const msgRoleMap = {
    [MessageRole.Assistant]: 'assistant',
    [MessageRole.System]: 'system',
    [MessageRole.User]: 'user',
}

const fragTypeIdentifyMap = {
    [MessageFragmentType.Request]: 'request',
    [MessageFragmentType.Think]: 'think',
    [MessageFragmentType.Tool]: 'tool',
    [MessageFragmentType.Response]: 'response',
    [MessageFragmentType.Error]: 'error',
}

const getMarkdownMode = (): 'full' | 'recommended' | 'disabled' => {
    if (props.message.role === MessageRole.Assistant) {
        return appStatePersist.assistantMarkdownRenderMode;
    } else {
        return appStatePersist.userSystemMarkdownRenderMode;
    }
};

const hasThinkingFrag = computed(() => props.message.fragments.some(frag => frag.type === MessageFragmentType.Think || frag.type === MessageFragmentType.Tool));
const totalThought = computed(() => {
    let total = 0;
    props.message.fragments.forEach(frag => {
        if (frag.type === MessageFragmentType.Think || frag.type === MessageFragmentType.Tool) {
            total += frag.elapsed ?? 0;
        }
    })
    return total;
});

const collapseThoughtContent = ref(false);
const toggleThoughtContent = () => {
    collapseThoughtContent.value = !collapseThoughtContent.value;
}
watch(() => props.message, () => collapseThoughtContent.value = false);

</script>

<style scoped>
.message-content {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

.thinking-tip-text {
    color: var(--color-secondary, gray);
    font-weight: bold;
    cursor: pointer;
}

.thinking-tip-text > .icon {
    margin-left: 0.5em;
    font-size: 0.8em;
    rotate: 0deg;
    transition: rotate 0.3s ease-in-out;
}

.thinking-tip-text > .icon[data-state="true"] {
    rotate: -90deg;
}

.fragment-text-viewer[data-type="think"] {
    color: var(--color-secondary, gray);
    border-left: 1px solid #ccc;
    padding-left: 1em;
}

.fragment-text-viewer[data-type="error"] {
    border: 1px solid red;
    padding: 5px 10px;
    border-radius: 10px;
}

.error-tip-text {
    color: red;
    font-weight: bold;
}

.spin {
    animation: spin 1s linear infinite;
}

.message-content[data-role="user"] :deep(p),
.message-content[data-role="system"] :deep(p) {
    margin: 0; /* For user-sent messages, do not add margin so that they looked like plain text */
}
</style>
