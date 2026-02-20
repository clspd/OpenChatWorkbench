<template>
    <div class="message-content">
        <template v-for="(frag, index) in props.message.fragments" :key="index">
            <div
                v-if="frag.contentType === MessageContentType.Text"
                class="fragment-text-viewer"
                :data-type="fragTypeIdentifyMap[frag.type]"
                v-html="getSafeHTML(frag.content)"
            ></div>
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
import { MessageContentType, MessageFragmentType, MessageRole, type Message } from '@/types/message';
import { getSafeHTML } from '@/utils/htmlpurify';

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

</style>
