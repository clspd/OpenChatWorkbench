<template>
    <div class="file-chooser-main">

    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
    type: 'file' | 'filehandle' | 'directory';
    multiple?: boolean;
    accept?: string;
    dndTarget?: EventTarget;
}>(), {
    multiple: false,
    accept: '',
});

watch(() => props.dndTarget, (newTarget, oldTarget) => {
    if (oldTarget) {
        oldTarget.removeEventListener('dragover', onDragOver);
        oldTarget.removeEventListener('drop', onDrop);
    }
    if (newTarget) {
        newTarget.addEventListener('dragover', onDragOver);
        newTarget.addEventListener('drop', onDrop);
    }
});

onBeforeUnmount(() => {
    if (props.dndTarget) {
        props.dndTarget.removeEventListener('dragover', onDragOver);
        props.dndTarget.removeEventListener('drop', onDrop);
    }
});

function onDragOver(e: Event) {
    e.preventDefault();
}

function onDrop(e: Event) {
    e.preventDefault();
    const dragEvent = e as DragEvent;
}



</script>

<style scoped>
.file-chooser-main {
    position: absolute;
}
</style>
