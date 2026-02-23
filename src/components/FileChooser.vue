<template>
    <div class="file-chooser-main">
        <input ref="inputFileRef" class="control" type="file" :name="'fileChooser_instance_' + instanceId" :multiple="multiple" :accept="accept" @change="onFile" />
        <Teleport :disabled="!props.dndOverlayTarget" :to="props.dndOverlayTarget" defer>
            <div class="dnd-overlay" v-if="dndInProgress" ref="dndOverlayRef" @click="dndInProgress = false" @keydown.esc="dndInProgress = false" @drop="onDrop">
                <div class="dnd-overlay-content">
                    <div class="dnd-overlay-icon">
                        <FileAddOutlined />
                    </div>
                    <div class="dnd-overlay-text">
                        {{ props.dndTipText }}
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { t } from 'i18next';
import { message } from 'ant-design-vue';

const props = withDefaults(defineProps<{
    type: 'file' | 'filehandle' | 'directory';
    multiple?: boolean;
    accept?: string;
    dndTarget?: EventTarget;
    dndOverlayTarget?: HTMLElement;
    dndChecker?: (e: DragEvent) => boolean | { dropEffect: 'copy' | 'move' | 'link' };
    dndTipText?: string;
}>(), {
    multiple: false,
    accept: '',
    dndChecker: (e: DragEvent) => e.dataTransfer?.types.some(type => type === 'Files') ?? false,
    dndTipText: t('common:ui.fileChooser.dnd.dropFiles'),
});

const emit = defineEmits<{
    (e: 'file', files: File[]): void;
    (e: 'filehandle', filehandles: FileSystemFileHandle[]): void;
    (e: 'directory', directories: FileSystemDirectoryHandle[]): void;
}>();

defineExpose({
    requestFile() {
        inputFileRef.value?.click()
    },
})

const instanceId = ref(crypto.randomUUID());
const inputFileRef = ref<HTMLInputElement>();
const dndOverlayRef = ref<HTMLDivElement>();
const dndInProgress = ref(false);

watch(() => props.dndTarget, (newTarget, oldTarget) => {
    if (oldTarget) {
        oldTarget.removeEventListener('dragover', onDragOver);
        oldTarget.removeEventListener('dragleave', onDragLeave);
    }
    if (newTarget) {
        newTarget.addEventListener('dragover', onDragOver);
        newTarget.addEventListener('dragleave', onDragLeave);
    }
}, { immediate: true });

onBeforeUnmount(() => {
    if (props.dndTarget) {
        props.dndTarget.removeEventListener('dragover', onDragOver);
        props.dndTarget.removeEventListener('dragleave', onDragLeave);
    }
});

function onFile(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target) return;
    const files = target.files;
    if (files) {
        emit('file', [...files]);
        target.value = '';
    }
}

function checkDrag(e: DragEvent) {
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) return false;
    const checkResult = props.dndChecker?.(e);
    if (!checkResult) return false;
    if (typeof checkResult === 'object' && checkResult.dropEffect) {
        dataTransfer.dropEffect = checkResult.dropEffect;
    }
    return true;
}

function onDragOver(e: Event) {
    const dragEvent = e as unknown as DragEvent;
    if (!checkDrag(dragEvent)) return;
    dndInProgress.value = true;
    e.preventDefault();
}

function onDragLeave(e: Event) {
    const rt = (e as DragEvent).relatedTarget;
    if (rt && rt instanceof Node && dndOverlayRef.value?.contains(rt)) return;
    dndInProgress.value = false;
}

function onDrop(e: Event) {
    const dragEvent = e as DragEvent;
    if (!checkDrag(dragEvent)) return;
    dndInProgress.value = false;
    dragEvent.preventDefault();
    if (!dragEvent.dataTransfer) return message.error(t('common:ui.fileChooser.dnd.error.emptyTransfer'));
    const result1: File[] = [], result2: FileSystemFileHandle[] = [], result3: FileSystemDirectoryHandle[] = [];
    let wrongTypeCount = 0;
    for (const item of dragEvent.dataTransfer.items) {
        if (item.kind === 'file') {
            if (props.type === 'file') {
                const file = item.getAsFile();
                if (!file) {
                    wrongTypeCount++;
                    continue;
                }
                result1.push(file);
            } else if (props.type === 'filehandle' || props.type === 'directory') {
                const handle: FileSystemHandle = (item as any).getAsFileSystemHandle();
                if (!handle) continue;
                if (handle.kind === 'file' && props.type === 'filehandle') {
                    result2.push(handle as FileSystemFileHandle);
                } else if (handle.kind === 'directory' && props.type === 'directory') {
                    result3.push(handle as FileSystemDirectoryHandle);
                } else {
                    wrongTypeCount++;
                }
            }
        }
    }
    if (wrongTypeCount > 0) {
        message.warn(t('common:ui.fileChooser.dnd.error.wrongType', { count: wrongTypeCount }));
    }
    if (props.type === 'file') {
        emit('file', result1);
    } else if (props.type === 'filehandle') {
        emit('filehandle', result2);
    } else if (props.type === 'directory') {
        emit('directory', result3);
    }
}



</script>

<style scoped>
.file-chooser-main {
    position: absolute;
}
.file-chooser-main > .control {
    display: none;
}
.dnd-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
}
.dnd-overlay-content {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
}
.dnd-overlay-icon {
    font-size: 2em;
}
</style>
