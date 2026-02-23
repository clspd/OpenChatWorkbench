<template>
   <div class="file-reference-container" ref="container" @wheel.prevent="transformWheel">
        <div v-for="file in props.references" :key="file.id" class="file-reference-item" role="link" tabindex="0">
            <div class="file-icon">
                <FileOutlined />
            </div>
            <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-size">{{ file.size }}B</div>
            </div>
            <div class="file-operation">
                <a-button type="text" shape="circle" @click="emit('remove-file', file.id)" v-if="props.canRemove">
                    <CloseOutlined />
                </a-button>
            </div>
        </div>
        <div v-if="hasUploading" class="file-reference-item">
            Uploading...
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FileAttachmentInfo } from '@/types/message';

const props = withDefaults(defineProps<{
    references: FileAttachmentInfo[],
    hasUploading?: boolean,
    canRemove?: boolean,
}>(), {
    hasUploading: false,
    canRemove: true,
});

const emit = defineEmits<{
    (e: 'remove-file', fileId: string): void;
}>();

defineExpose({
    scrollToEnd: () => {
        if (container.value) {
            container.value.scrollTo({
                left: container.value.scrollWidth,
                behavior: 'smooth',
            })
        }
    },
})

const container = ref<HTMLElement>();

const transformWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!container.value) return;
    container.value.scrollTo({
        left: container.value.scrollLeft + e.deltaY,
        behavior: 'instant',
    })
}



</script>

<style scoped>
.file-reference-container {
    display: flex;
    flex-wrap: nowrap;
    white-space: nowrap;
    overflow: auto;
    gap: 0.5em;
}

.file-reference-container::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.file-reference-item {
    display: flex;
    align-items: center;
    background-color: var(--file-reference-bg-color, #fff);
    border: 1px solid var(--file-reference-border-color, #ccc);
    border-radius: 10px;
    padding: 0.2em 0.5em;
    gap: 6px;
    transition: all 0.2s;
    cursor: pointer;
}

.file-reference-item:hover {
    background-color: var(--file-reference-hover-bg-color, #f0f0f0);
}
</style>
