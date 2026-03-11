<template>
    <div class="input-message" ref="inputMessageRef" :data-disabled="props.disabled" @keydown="handleMoreOptButtonShortcut">
        <div v-if="props.isEditing" class="edit-message-title">
            <span>{{ t('common:ui.mainInput.editing.title', { id: props.editMessageId }) }}</span>
            <div class="flexible-space"></div>
            <a-button type="text" shape="circle" :disabled="props.disabled" @click="emit('update:isEditing', false)"><CloseOutlined /></a-button>
        </div>
        <MessageFileReferences
            v-if="props.files.length > 0 || hasUploading"
            ref="fileReferencesRef"
            class="file-ref"
            :references="files"
            :has-uploading="hasUploading"
            :disabled="props.disabled"
            @remove-file="removeFile"
            @remove-all="removeAllFiles"
        />
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
                        <a-menu @click="({ key }: any) => handleAttachMenuClick(key)" :disabled="props.disabled">
                            <a-menu-item key="attachFile">
                                <LinkOutlined />
                                {{ t('common:ui.mainInput.options.attachFile') }}
                                <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+E or Ctrl+1</span>
                            </a-menu-item>
                            <a-menu-item key="attachImage">
                                <FileImageOutlined />
                                {{ t('common:ui.mainInput.options.attachImage') }}
                                <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+2</span>
                            </a-menu-item>
                            <a-menu-item key="attachDirectory">
                                <a-tooltip placement="right">
                                    <template #title>{{ t('common:ui.mainInput.options.attachDirectoryDesc') }}</template>
                                    <FolderOutlined />
                                    {{ t('common:ui.mainInput.options.attachDirectory') }}
                                    <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+3</span>
                                </a-tooltip>
                            </a-menu-item>
                            <a-menu-divider />
                            <a-menu-item key="deepThink" :style="{ color: isDeepThinkEnabled ? 'var(--text-primary-color)' : '' }">
                                <CheckOutlined :style="{ color: isDeepThinkEnabled ? 'var(--text-primary-color)' : 'transparent' }" />   
                                {{ t('common:ui.mainInput.options.deepThink') }}
                                <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+\ or Ctrl+4</span>
                            </a-menu-item>
                            <a-menu-item key="systemPrompt" :disabled="!props.isCreatingConversation">
                                <a-tooltip placement="right">
                                    <template #title>{{ props.isCreatingConversation ? t('common:ui.mainInput.options.systemPromptDesc') : t('common:ui.mainInput.options.systemPromptNotAvailableReason') }}</template>
                                    <SettingOutlined />
                                    {{ t('common:ui.mainInput.options.systemPrompt') }}
                                    <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+' or Ctrl+5</span>
                                </a-tooltip>
                            </a-menu-item>
                            <a-menu-divider />
                            <a-menu-item key="plainInput" :style="{ color: appStatePersist.usePlainInput ? 'var(--text-primary-color)' : '' }">
                                <CheckOutlined :style="{ color: appStatePersist.usePlainInput ? 'var(--text-primary-color)' : 'transparent' }" />   
                                {{ t('common:ui.mainInput.options.plainInput') }}
                                <span class="keybd-shortcut-tip" aria-hidden="true">Ctrl+6</span>
                            </a-menu-item>
                        </a-menu>
                    </template>
                    
                    <a-button shape="circle" type="text" :disabled="props.disabled" :aria-label="t('common:ui.mainInput.options.showMoreOptions')">
                        <PlusOutlined />
                    </a-button>
                </a-dropdown>
            </div>
            <div class="model-chooser">
                <ModelChooser
                    ref="modelChooserRef"
                    :disabled="props.disabled"
                    :modelId="props.modelId" @update:modelId="emit('update:modelId', $event)"
                    :providerId="props.providerId" @update:providerId="emit('update:providerId', $event)" />
            </div>
            <div class="status-tip">
                <span>{{ isDeepThinkEnabled ? "T" : "" }}</span>
                <span>{{ appStatePersist.usePlainInput ? "P" : "" }}</span>
            </div>
            <div class="flexible-space"></div>
            <div class="send-button">
                <a-button :disabled="props.disabled || (!props.isGenerating && isEmptyMessage && 0 === files.length)" type="primary" shape="circle" @click="send" aria-label="Send message">
                    <LoadingOutlined v-if="props.disabled" class="loading-indicator" />
                    <span v-else-if="props.isGenerating">■</span>
                    <ArrowUpOutlined v-else />
                </a-button>
            </div>
        </div>
        <FileChooser ref="fileChooser"
            :id="app_name_id + '_InputMessage_inputbox_filechooser__' + props.instanceId"
            :type="fileChooserType" :multiple="true" :accept="fileChooserAccept" :fsa-accept="fileChooserFSAccept"
            :dndTarget="dndTarget" :dndOverlayTarget="dndOverlayTarget"
            :recursiveReadDirectory="true"
            @file="eatFile"
        />
    </div>
</template>

<script setup lang="ts">
// vendor
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue'
import { t } from 'i18next'
import { cloneDeep } from 'lodash-es'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { message, Modal } from 'ant-design-vue'
// utils, types, stores
import { DeleteAttachment, PutAttachment } from '@/modules/chat/attachment'
import { safeParseJSON, tiptap2markdown } from '@/utils/parseTiptap'
import { EMPTY_MESSAGE, MessageFeatureType, type FileAttachmentInfo, type MessageFeatureItem } from '@/types/message'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
// components
import ModelChooser from './ModelChooser.vue'
import FileChooser from './FileChooser.vue'
import MessageFileReferences from './MessageFileReferences.vue'
import { COMMON_TEXT_FILE_EXTENSION } from '@/modules/ui-utils/commonExt'
import { app_name_id } from '@/config'
import { getSafeHTML } from '@/utils/htmlpurify'

const props = withDefaults(defineProps<{
    modelValue: string,
    modelId: string,
    providerId: string,
    disabled?: boolean,
    isGenerating?: boolean,
    isEditing?: boolean,
    editMessageId?: number,
    features: MessageFeatureItem[],
    files: FileAttachmentInfo[],
    instanceId?: string,
    isCreatingConversation?: boolean,
    globalDnD?: boolean,
}>(), {
    modelValue: '',
    modelId: '',
    providerId: '',
    disabled: false,
    isGenerating: false,
    isEditing: false,
    editMessageId: 0,
    features: () => [],
    files: () => [],
    instanceId: 'default',
    isCreatingConversation: false,
    globalDnD: false,
});
const emit = defineEmits([
    'update:modelValue', 'update:modelId', 'update:providerId', 'update:features', 'update:files',
    'sendMessage',
    'interruptMessage',
    'editSystemPrompt',
    'update:isEditing',
])
defineExpose({
    setHTML(html: string) {
        return editor.value?.commands.setContent(html);
    },
    setText(text: string) { 
        return editor.value?.commands.setContent({
            type: 'doc',
            content: [{
                type: 'paragraph',
                content: [{
                    type: 'text',
                    text,
                }]
            }]
        });
    },
    focus() {
        editor.value?.commands.focus()
    },
})

const modelChooserRef = ref<InstanceType<typeof ModelChooser>>()
const inputMessageRef = ref<HTMLDivElement>()
const dndTarget = computed(() => props.globalDnD ? window : inputMessageRef.value);
const dndOverlayTarget = computed(() => props.globalDnD ? document.body : undefined);

const editor = ref<Editor>()
const send = () => props.isGenerating ? emit('interruptMessage') : emit('sendMessage')

const appStatePersist = useAppStatePersistStore()

onMounted(() => {
    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                link: false,
            }),
            Placeholder.configure({
                placeholder: t('common:ui.mainInput.placeholder'),
            }),
            Link.configure({
                openOnClick: false,
                autolink: false,
            }),
        ],
        content: safeParseJSON(props.modelValue, structuredClone(EMPTY_MESSAGE)),
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
                    if (
                        (appStatePersist.sendMessageWithCtrlEnter && (!event.ctrlKey || event.altKey || event.shiftKey))
                        || event.shiftKey
                    ) {
                        editor.value?.commands.insertContent('<br>')
                        return true
                    }
                    if (props.isGenerating) return false
                    event.preventDefault()
                    send()
                    return true
                }
                if (event.key === '/' && event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey && !props.isGenerating) {
                    event.preventDefault()
                    modelChooserRef.value?.open()
                    return true
                }
                if (event.key === 'E' && event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
                    event.preventDefault()
                    handleAttachMenuClick('attachFile');
                    return true
                }
                return false
            },
            handlePaste: (view, event) => {
                const clipboardData = event.clipboardData;
                if (!clipboardData || !editor.value) return false;
                const pastedText = clipboardData.getData('text/plain');
                const pastedHTML = clipboardData.getData('text/html');
                event.preventDefault();
                if (pastedHTML) editor.value.commands.insertContent(getSafeHTML(pastedHTML, undefined, false));
                else if (pastedText) editor.value.commands.insertContent({
                    type: 'text',
                    text: pastedText
                });

                return true;
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

    const json = (!newValue) ? structuredClone(EMPTY_MESSAGE) : safeParseJSON(newValue, null)
    if (json) editor.value?.commands.setContent(json)
})

watch(() => props.disabled, (newValue) => {
    editor.value?.setEditable(!newValue)
})

const isEmptyMessage = computed(() => {
    return editor.value?.getText().trim() === ''
})

const fileChooser = ref<InstanceType<typeof FileChooser>>()
const fileChooserType = ref<'file' | 'filehandle' | 'directory'>('file')
const fileChooserAccept = ref<string>('')
const fileChooserFSAccept = ref<FilePickerAcceptType[]>([]);
const hasUploading = ref<boolean>(false)
const fileReferencesRef = ref<InstanceType<typeof MessageFileReferences>>()

const eatFile = async (files: File[]) => {
    hasUploading.value = true;
    const mySize = appStatePersist.fileUploadThrottleSize * 1024 * 1024;
    try {
        const newFiles = [];
        for (const file of files) {
            const ext = '.' + ((file.name.split(".").pop())?.toLowerCase() || "");
            if (!file.type.startsWith('image/') && (!ext || !COMMON_TEXT_FILE_EXTENSION.includes(ext))) {
                if (!await new Promise(r => Modal.confirm({
                    title: t('common:ui.mainInput.confirmUploadNonTextFile.title'),
                    content: t('common:ui.mainInput.confirmUploadNonTextFile.content', { fileName: file.name, fileSize: (file.size / (1024 * 1024)).toFixed(2) }),
                    okText: t('common:ui.dialog.yes'),
                    cancelText: t('common:ui.dialog.no'),
                    onOk: () => r(true),
                    onCancel: () => r(false),
                }))) continue;
            }
            else if (file.size > mySize) {
                if (!await new Promise(r => Modal.confirm({
                    title: t('common:ui.mainInput.confirmUploadLargeFile.title'),
                    content: t('common:ui.mainInput.confirmUploadLargeFile.content', { fileName: file.name, fileSize: (file.size / (1024 * 1024)).toFixed(2) }),
                    okText: t('common:ui.dialog.yes'),
                    cancelText: t('common:ui.dialog.no'),
                    onOk: () => r(true),
                    onCancel: () => r(false),
                }))) continue;
            }
            newFiles.push(await PutAttachment(file));
        }
        emit('update:files', [...props.files, ...newFiles]);
        nextTick(() => fileReferencesRef.value?.scrollToEnd())
    } catch (error) {
        console.error('[InputMessage]', 'Unable to upload attachment: ' + error);
        message.error(t('common:ui.mainInput.errors.uplAtta') + error);
    } finally {
        hasUploading.value = false;
    }
};

const removeFile = async (id: string) => {
    try {
        await DeleteAttachment(id);
    } catch (error) {
        console.error('[InputMessage]', 'Unable to delete attachment: ' + error);
        message.error(t('common:ui.mainInput.errors.delAtta') + error);
        return;
    }
    emit('update:files', props.files.filter((item) => item.id !== id));
}

const removeAllFiles = async () => {
    if (props.disabled) return;
    message.info(t('common:ui.mainInput.removeAllAtta'))
    let errCnt = 0;
    const ids = cloneDeep(props.files.map((item) => item.id));
    emit('update:files', []);
    for (const id of ids) try {
        await DeleteAttachment(id);
    } catch { errCnt++ }
    if (errCnt > 0) {
        message.error(t('common:ui.mainInput.errors.delAttaSome', { count: errCnt }));
    }
    else {
        message.success(t('common:ui.mainInput.removedAllAtta'))
    }
}

// --------

const isDeepThinkEnabled = computed<boolean>({
    get: () => {
        return props.features.some((item) => item.type === 'thinking' && !!item.value);
    },
    set: (newVal: boolean) => {
        if (isDeepThinkEnabled.value === newVal) return;
        if (!props.features.some((item) => item.type === MessageFeatureType.Thinking)) {
            const newArray = cloneDeep(toRaw(props.features));
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

const handleAttachMenuClick = (key: string) => {
    if (props.disabled) {
        return
    }
    if (key === 'deepThink') {
        isDeepThinkEnabled.value = !isDeepThinkEnabled.value
    }
    if (key === 'plainInput') {
        appStatePersist.usePlainInput = !appStatePersist.usePlainInput
    }
    if (key === 'systemPrompt') {
        emit("editSystemPrompt");
    }
    if (key === 'attachFile' || key === 'attachImage') {
        fileChooserType.value = 'file';
        fileChooserAccept.value = key === 'attachFile' ? '*' : 'image/*';
        fileChooserFSAccept.value = [{
            accept: {
                [key === 'attachFile' ? 'text/*' : 'image/*']: [],
            },
        }];
        nextTick(() => fileChooser.value?.requestFile())
    }
    if (key === 'attachDirectory') {
        fileChooserAccept.value = '';
        fileChooserFSAccept.value = [];
        const isSupported = fileChooser.value?.fsSupported();
        if (isSupported) {
            fileChooserType.value = 'file';
            nextTick(() => fileChooser.value?.requestFSRecursiveReadDirectory(true, true));
        }
        else {
            fileChooserType.value = 'directory';
            nextTick(() => fileChooser.value?.requestFile());
        }
    }
}

const handleMoreOptButtonShortcut = (e: KeyboardEvent) => {
    if (!(e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey)) return;
    switch (e.key) {
        case '1':
        case 'E':
            handleAttachMenuClick('attachFile');
            break;
        case '2':
            handleAttachMenuClick('attachImage');
            break;
        case '3':
            handleAttachMenuClick('attachDirectory');
            break;
        case '4':
        case '\\':
            handleAttachMenuClick('deepThink');
            break;
        case '5':
        case "'":
            handleAttachMenuClick('systemPrompt');
            break;
        case '6':
            handleAttachMenuClick('plainInput');
            break;
        default: return;
    }
    e.preventDefault();
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
    margin: 0 auto;
    overflow: hidden;
}
.input-message[data-disabled="true"] {
    cursor: not-allowed;
    color: var(--color-disabled-text);
}
.keybd-shortcut-tip {
    color: var(--color-disabled-text);
}
.edit-message-title {
    background-color: #f0f0f0;
    padding: 0.5em 0.5em 0.5em 1em;
    user-select: none;
    display: flex;
    align-items: center;
}
.edit-message {
    flex: 1;
    padding: 0.5em 1em 0 1em;
    margin-top: 0.5em;
    min-height: 4em;
    max-height: calc(100vh - 20em);
    overflow: auto;
    outline: none !important;
}
textarea.edit-message {
    resize: none;
    border: none;
    min-height: 6em;
    border-radius: 0;
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
    margin-top: 1em;
    padding: 0 1em 1em 1em;
    gap: 0.5em;
}
.model-chooser {
    overflow: auto;
    display: flex;
    align-items: center;
}
.status-tip {
    margin-left: 0.5em;
}
.loading-indicator {
    animation: spin 0.5s linear infinite;
}
.file-ref {
    padding: 1em 1em 0.5em 1em;
}
</style>

<style scoped>
.edit-message :deep(p) {
    margin: 0;
}
</style>
