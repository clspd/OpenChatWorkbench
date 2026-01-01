<template>
    <div class="input-message">
        <editor-content class="edit-message"
            :editor="editor"
            @keydown.enter="handleEnterPress"
        ></editor-content>
        <div class="bottom-view">
            <div class="model-chooser"></div>
            <div class="file-attacher"></div>
            <div class="flexible-space"></div>
            <div class="send-button">
                <a-button type="primary" shape="circle">
                    <ArrowUpOutlined />
                </a-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { Placeholder } from '@tiptap/extension-placeholder'

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
})
const emit = defineEmits(['update:modelValue', 'sendMessage'])

const editor = ref<Editor>()

onMounted(() => {
    editor.value = new Editor({
        extensions: [
            StarterKit,
            Placeholder,
        ],
        content: props.modelValue,
        onUpdate: () => {
            const html = editor.value?.getHTML()
            if (html) emit('update:modelValue', html)
        }
    })
})
onBeforeUnmount(() => {
    editor.value?.destroy()
})

watch(() => props.modelValue, (newValue) => {
    // HTML
    const isSame = editor.value?.getHTML() === newValue

    // JSON
    // const isSame = JSON.stringify(this.editor.getJSON()) === JSON.stringify(value)

    if (isSame) {
        return
    }

    editor.value?.commands.setContent(newValue)
})

const handleEnterPress = (ev: KeyboardEvent) => {
    if (ev.shiftKey) {
        return
    }
    ev.preventDefault()
    emit('sendMessage', props.modelValue)
}
</script>

<style scoped>
.input-message {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--split-border-color);
    border-radius: 1em;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 50rem;
    padding: 1em;
}
.edit-message {
    flex: 1;
    min-height: 6em;
    max-height: calc(100vh - 20em);
    overflow: auto;
}
.edit-message > * {
    outline: none !important;
    min-height: 6em;
}
.edit-message :deep(p:first-child) {
    margin-top: 0;
}
.edit-message::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
.edit-message::-webkit-scrollbar-track {
    background-color: #f5f5f5;
}
.edit-message::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 4px;
}
.edit-message::-webkit-scrollbar-thumb:hover {
    background-color: #999;
}
.bottom-view {
    display: flex;
    align-items: center;
    margin-top: 0.5em;
}
.model-chooser {
    margin-right: 0.5em;
}
.file-attacher {
    margin-right: 0.5em;
}
</style>
