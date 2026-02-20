<template>
    <div class="message-content">
        <template v-for="(frag, index) in props.message.fragments" :key="index">
            <div
                v-if="frag.contentType === MessageContentType.Text"
                class="fragment-text-viewer"
                :data-type="fragTypeIdentifyMap[frag.type]"
            >
                <div v-if="frag.type === MessageFragmentType.Error" class="error-tip-text">
                    An error has occurred. See the details below for more information.
                </div>
                <MarkdownRenderer :content="frag.content" :disabled="frag.type === MessageFragmentType.Error" />
            </div>
            <div v-else class="err-not-supported">
                The content type of this fragment is not supported
            </div>
        </template>
        <div v-if="props.message.fragments.length === 0" class="empty-message">
            This message is empty.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
import { MessageContentType, MessageFragmentType, type Message } from '@/types/message';

const props = defineProps<{
    message: Message;
}>();

const fragTypeIdentifyMap = {
    [MessageFragmentType.Request]: 'request',
    [MessageFragmentType.Think]: 'think',
    [MessageFragmentType.Tool]: 'tool',
    [MessageFragmentType.Response]: 'response',
    [MessageFragmentType.Error]: 'error',
}


</script>

<style scoped>
.message-content {
    display: flex;
    flex-direction: column;
}

.fragment-text-viewer[data-type="think"] {
    color: var(--color-secondary, gray);
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
</style>
