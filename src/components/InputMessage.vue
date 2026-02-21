<template>
    <div class="input-message" :data-disabled="props.disabled">
        <editor-content v-show="!appStatePersist.usePlainInput" class="edit-message"
            :editor="editor"
        ></editor-content>
        <a-textarea v-if="appStatePersist.usePlainInput" class="edit-message"
            :disabled="props.disabled" auto-size
            :value="tiptap2markdown(props.modelValue)" @update:value="emit('update:modelValue', convertToTiptapFmt($event))"
        ></a-textarea>
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
                            <a-menu-item key="deepThink" :style="{ color: isDeepThinkEnabled ? 'var(--text-primary-color)' : '' }">
                                <CheckOutlined :style="{ color: isDeepThinkEnabled ? 'var(--text-primary-color)' : 'transparent' }" />   
                                Deep Think
                            </a-menu-item>
                            <a-menu-divider />
                            <a-menu-item key="plainInput" :style="{ color: appStatePersist.usePlainInput ? 'var(--text-primary-color)' : '' }">
                                <CheckOutlined :style="{ color: appStatePersist.usePlainInput ? 'var(--text-primary-color)' : 'transparent' }" />   
                                Plain Input
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
                    :disabled="props.disabled"
                    :modelId="props.modelId" @update:modelId="emit('update:modelId', $event)"
                    :providerId="props.providerId" @update:providerId="emit('update:providerId', $event)" />
            </div>
            <div class="flexible-space"></div>
            <div class="send-button">
                <a-button :disabled="props.disabled || isEmptyMessage" type="primary" shape="circle" @click="send">
                    <LoadingOutlined v-if="props.disabled" class="loading-indicator" />
                    <span v-else-if="props.isGenerating">■</span>
                    <ArrowUpOutlined v-else />
                </a-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import ModelChooser from './ModelChooser.vue'
import { safeParseJSON, tiptap2markdown } from '@/utils/parseTiptap'
import { EMPTY_MESSAGE, EMPTY_MESSAGE_JSON, MessageFeatureType, type MessageFeatureItem } from '@/types/message'
import { useAppStatePersistStore } from '@/stores/appStatePersist'

const props = withDefaults(defineProps<{
    modelValue: string,
    modelId: string,
    providerId: string,
    disabled?: boolean,
    isGenerating?: boolean,
    features: MessageFeatureItem[],
}>(), {
    modelValue: '',
    modelId: '',
    providerId: '',
    disabled: false,
    isGenerating: false,
    features: () => [],
});
const emit = defineEmits([
    'update:modelValue', 'update:modelId', 'update:providerId', 'update:features',
    'sendMessage',
    'interruptMessage',
])

const editor = ref<Editor>()
const send = () => props.isGenerating ? emit('interruptMessage') : emit('sendMessage')

const appStatePersist = useAppStatePersistStore()

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
                    if (appStatePersist.sendMessageWithCtrlEnter && (!event.ctrlKey || event.altKey || event.shiftKey)) {
                        return false;
                    }
                    if (event.shiftKey) {
                        editor.value?.commands.insertContent('<br>')
                        return true
                    }
                    event.preventDefault()
                    send()
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
    const isSame = JSON.stringify(editor.value?.getJSON()) === newValue
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

const isEmptyMessage = computed(() => {
    return editor.value?.getText().trim() === ''
})

const isDeepThinkEnabled = computed<boolean>({
    get: () => {
        return props.features.some((item) => item.type === 'thinking' && !!item.value);
    },
    set: (newVal: boolean) => {
        if (isDeepThinkEnabled.value === newVal) return;
        if (!props.features.some((item) => item.type === MessageFeatureType.Thinking)) {
            const newArray = structuredClone(toRaw(props.features));
            newArray.push({ type: MessageFeatureType.Thinking, value: newVal });
            emit('update:features', newArray);
            return;
        }
        const newFeatures = props.features.map((item) => {
            if (item.type === MessageFeatureType.Thinking) {
                item.value = newVal
            }
            return item
        })
        emit('update:features', newFeatures)
    }
})

const convertToTiptapFmt = (markdown: string) => {
    return JSON.stringify({ "type": "doc", "content": [{ "type": "paragraph", "content": [markdown && ({ "type": "text", "text": markdown })] }] })
}

const handleAttachMenuClick = ({ key = '' }) => {
    if (props.disabled) {
        return
    }
    if (key === 'deepThink') {
        isDeepThinkEnabled.value = !isDeepThinkEnabled.value
    }
    if (key === 'plainInput') {
        appStatePersist.usePlainInput = !appStatePersist.usePlainInput
    }
    if (key === 'attachFile' || key === 'attachImage') {
        alert("Not implemented")
    }
}
</script>

<style scoped>
.input-message {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--input-border-color);
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
    min-height: 4em;
    max-height: calc(100vh - 20em);
    overflow: auto;
}
.edit-message > * {
    outline: none !important;
    min-height: 4em;
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
.loading-indicator {
    animation: spin 0.5s linear infinite;
}
</style>

<style scoped>
.edit-message :deep(p) {
    margin: 0;
}
</style>
