<template>
    <div class="input-message" :data-disabled="props.disabled">
        <editor-content class="edit-message"
            :editor="editor"
        ></editor-content>
        <div class="bottom-view">
           <div class="attacher">
                <a-dropdown placement="top" :trigger="['click']">
                    <template #overlay>
                        <a-menu @click="handleAttachMenuClick" :disabled="props.disabled">
                            <a-menu-item key="attachFile">
                                <LinkOutlined />
                                Attach File
                            </a-menu-item>
                            <a-menu-item key="attachImage">
                                <FileImageOutlined />
                                Attach Image
                            </a-menu-item>
                            <a-menu-divider />
                            <a-menu-item key="deepThink">
                                <CheckOutlined :style="{ color: props.config.thinking_enabled ? 'var(--primary-color)' : 'transparent' }" />
                                Deep Think
                            </a-menu-item>
                        </a-menu>
                    </template>
                    <a-button shape="circle" type="text" :disabled="props.disabled">
                        <PlusOutlined />
                    </a-button>
                </a-dropdown>
            </div>
            <div class="model-chooser">
                <ModelChooser
                    :modelId="props.modelId" @update:modelId="emit('update:modelId', $event)"
                    :providerId="props.providerId" @update:providerId="emit('update:providerId', $event)" />
            </div>
            <div class="flexible-space"></div>
            <div class="send-button">
                <a-button :disabled="props.disabled" type="primary" shape="circle" @click="emit('sendMessage')">
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
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import ModelChooser from './ModelChooser.vue'
import { safeParseJSON } from '@/utils/parseTiptap'
import { EMPTY_MESSAGE } from '@/types'

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    modelId: {
        type: String,
        default: ''
    },
    providerId: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
    config: {
        type: Object,
        default: () => ({})
    }
})
const emit = defineEmits(['update:modelValue', 'update:modelId', 'update:providerId', 'update:config', 'sendMessage'])

const editor = ref<Editor>()

onMounted(() => {
    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                link: false,
            }),
            Placeholder,
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
        ],
        content: safeParseJSON(props.modelValue, EMPTY_MESSAGE),
        editable: !props.disabled,
        onUpdate: () => {
            // const html = editor.value?.getHTML()
            // if (html) emit('update:modelValue', html)
            const json = editor.value?.getJSON()
            if (json) emit('update:modelValue', JSON.stringify(json))
        },
        editorProps: {
            handleKeyDown: (view, event) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        editor.value?.commands.insertContent('<br>')
                        return true
                    }
                    event.preventDefault()
                    emit('sendMessage')
                    return true
                }
                return false
            },
        },
    })
})
onBeforeUnmount(() => {
    editor.value?.destroy()
})

watch(() => props.modelValue, (newValue, oldValue) => {
    // HTML
    // const isSame = editor.value?.getHTML() === newValue

    // JSON
    const isSame = oldValue === newValue
    // console.log('isSame', isSame, '|', oldValue, '|', newValue)

    if (isSame) {
        return
    }

    const json = (!newValue) ? EMPTY_MESSAGE : safeParseJSON(newValue, null)
    if (json) editor.value?.commands.setContent(json)
})

watch(() => props.disabled, (newValue) => {
    editor.value?.setEditable(!newValue)
})

const handleAttachMenuClick = ({ key = '' }) => {
    if (props.disabled) {
        return
    }
    if (key === 'deepThink') {
        emit('update:config', { ...props.config, thinking_enabled: !props.config.thinking_enabled })
    }
    if (key === 'attachFile' || key === 'attachImage') {
        
    }
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
    margin: 0 auto;
}
.input-message[data-disabled="true"] {
    cursor: not-allowed;
    color: var(--color-disabled-text);
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
.edit-message > * > :deep(:first-child) {
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
    overflow: auto;
    display: flex;
    align-items: center;
}
.attacher {
    margin-right: 0.5em;
}
</style>
