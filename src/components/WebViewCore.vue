<template>
    <iframe
        ref="e"
        :[srcType]="content"
        :sandbox="props.sandbox"
        :allow="props.allow"
        :aria-label="props.label"
        v-bind="$attrs"
    ></iframe>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const e = ref<HTMLIFrameElement>();

const props = withDefaults(defineProps<{
    type?: 'url' | 'document';
    content: string;
    disabled?: boolean;
    sandbox?: string;
    allow?: string;
    label?: string;
}>(), {
    type: 'url',
    disabled: false,
})

defineExpose({
    get: () => e.value,
    postMessage(data: any, origin: string, transfer?: Transferable[]) {
        if (!e.value) throw new Error('Frame not prepared or was removed');
        if (!e.value.contentWindow) throw new Error('Cannot access the content of the frame');
        return e.value.contentWindow.postMessage(data, origin, transfer);
    },
});

const srcType = computed(() => ({
    url: 'src',
    document: 'srcdoc'
})[props.type]);

const content = computed(() => props.disabled ? '' : props.content);

</script>

<style scoped>
iframe {
    border: 0;
    box-sizing: border-box;
}
</style>