<template>
    <div class="file-chooser-main">
        <input ref="inputFileRef" class="control" type="file" :id="id" :name="'fileChooser_instance_' + instanceId" :multiple="multiple" :accept="accept" :webkitdirectory="type === 'directory' && recursiveReadDirectory" @change="onFile" />
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { t } from 'i18next';
import { message } from 'ant-design-vue';

const props = withDefaults(defineProps<{
    type: 'file' | 'filehandle' | 'directory' | 'auto';
    id?: string;
    multiple?: boolean;
    accept?: string;
    recursiveReadDirectory?: boolean;
    dndTarget?: EventTarget;
    dndOverlayTarget?: HTMLElement;
    dndChecker?: (e: DragEvent) => boolean | { dropEffect: 'copy' | 'move' | 'link' };
    dndTipText?: string;
    fsaAccept?: FilePickerAcceptType[];
    fsaStartIn?: FileSystemHandle;
    fsaMode?: 'read' | 'readwrite';
}>(), {
    multiple: false,
    accept: '',
    dndChecker: (e: DragEvent) => e.dataTransfer?.types.some(type => type === 'Files') ?? false,
    dndTipText: t('common:ui.fileChooser.dnd.dropFiles'),
});

const emit = defineEmits<{
    (e: 'file', files: File[]): void;
    (e: 'filehandle', filehandles: FileSystemFileHandle[]): void;
    (e: 'directory', directoryhandle: FileSystemDirectoryHandle[]): void;
    (e: 'directorycontent', directorycontent: Map<string, FileSystemFileHandle>): void;
}>();

const suppotsFileSystemAccess = computed(() => {
    return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window && typeof window.showOpenFilePicker === 'function' && typeof window.showDirectoryPicker === 'function';
});

defineExpose({
    fsSupported() {
        return suppotsFileSystemAccess.value;
    },
    requestFile() {
        if (suppotsFileSystemAccess.value) {
            if (props.type === 'file') {
                this.requestFSFileHandle(true, true);
            }
            else if (props.type === 'directory') {
                if (props.recursiveReadDirectory) {
                    this.requestFSRecursiveReadDirectory();
                } else {
                    this.requestFSDirectoryHandle();
                }
            } else {
                this.requestFSFileHandle();
            }
            return;
        }
        inputFileRef.value?.click()
    },
    requestFSFileHandle(doEmit = true, compatibleMode = false) {
        const options: OpenFilePickerOptions = {
            types: props.fsaAccept,
            multiple: props.multiple,
            startIn: props.fsaStartIn,
        };
        return window.showOpenFilePicker(options).then(async (filehandles) => {
            if (doEmit) {
                if (compatibleMode) {
                    emit('file', await Promise.all(filehandles.map(fh => fh.getFile())));
                }
                else emit('filehandle', filehandles);
            }
            else return filehandles;
        }).catch(() => null);
    },
    requestFSDirectoryHandle(doEmit = true) {
        const options: DirectoryPickerOptions = {
            startIn: props.fsaStartIn,
            mode: props.fsaMode,
        };
        return window.showDirectoryPicker(options).then((directoryhandles) => {
            if (doEmit) emit('directory', [directoryhandles]);
            else return directoryhandles;
        }).catch(() => null);
    },
    async requestFSRecursiveReadDirectory(doEmit = true, compatibleMode = false) {
        try {
            const options: DirectoryPickerOptions = {
                startIn: props.fsaStartIn,
                mode: props.fsaMode,
            };
            const directoryhandle = await window.showDirectoryPicker(options);
            if (!directoryhandle) return;
            const files = await readdir(directoryhandle);
            if (doEmit) {
                if (compatibleMode) {
                    const result: File[] = [];
                    for (const [name, filehandle] of files) {
                        if (filehandle.kind === 'file') {
                            const file = (await filehandle.getFile());
                            result.push(createFileNameProxy(file, name));
                        }
                    }
                    emit('file', result);
                }
                else emit('directorycontent', files);
            }
            else return files;
        }
        catch { return null; }
    }
})

const instanceId = ref(crypto.randomUUID());
const inputFileRef = ref<HTMLInputElement>();
const dndOverlayRef = ref<HTMLDivElement>();
const dndInProgress = ref(false);

watch(() => props.dndTarget, (newTarget, oldTarget) => {
    if (oldTarget) {
        oldTarget.removeEventListener('dragover', onDragOver);
        oldTarget.removeEventListener('dragleave', onDragLeave);
        oldTarget.removeEventListener('paste', onPaste, true);
    }
    if (newTarget) {
        newTarget.addEventListener('dragover', onDragOver);
        newTarget.addEventListener('dragleave', onDragLeave);
        newTarget.addEventListener('paste', onPaste, true);
    }
}, { immediate: true });

onBeforeUnmount(() => {
    if (props.dndTarget) {
        props.dndTarget.removeEventListener('dragover', onDragOver);
        props.dndTarget.removeEventListener('dragleave', onDragLeave);
        props.dndTarget.removeEventListener('paste', onPaste, true);
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
    processDataTransfer(dragEvent.dataTransfer).catch(e => message.error(String(e)));
}

function onPaste(e: Event) {
    const pasteEvent = e as ClipboardEvent;
    if (!pasteEvent.clipboardData) return message.error(t('common:ui.fileChooser.dnd.error.emptyTransfer'));
    let hasFile = false;
    for (const item of pasteEvent.clipboardData.items) {
        if (item.kind === 'file') {
            hasFile = true;
            break;
        }
    }
    if (!hasFile) return;
    e.preventDefault();
    processDataTransfer(pasteEvent.clipboardData).catch(e => message.error(String(e)));
}

async function readdir(dirhandle: FileSystemDirectoryHandle, prefix = '', depth = 0, maxDepth = 64) {
    const files = new Map<string, FileSystemFileHandle>();
    for await (const entry of dirhandle.values()) {
        if (entry.kind === 'file') {
            files.set(prefix + entry.name, entry);
        } else if (entry.kind === 'directory') {
            if (depth >= maxDepth) throw new Error('Directory depth exceeds maxDepth');
            const subFiles = await readdir(entry, prefix + entry.name + '/', depth + 1, maxDepth);
            for (const [name, handle] of subFiles) {
                files.set(name, handle);
            }
        }
    }
    return files;
}

function createFileNameProxy(file: File, name: string) {
    const proxy = new Proxy(file, {
        get(target, prop, receiver) {
            if (prop === 'name') return name;
            const v = Reflect.get(target, prop); // ignore receiver
            if (typeof v === 'function') return v.bind(target);
            return v;
        },
        set(target, prop, value, receiver) {
            if (prop === 'name') return false;
            return Reflect.set(target, prop, value); // ignore receiver
        }
    });
    return proxy;
}

function processDataTransfer(dt: DataTransfer) {
    const result1: File[] = [],
        result2: FileSystemFileHandle[] = [],
        result3: FileSystemDirectoryHandle[] = [],
        result4: Map<string, FileSystemFileHandle> = new Map();
    const fsh: Promise<FileSystemHandle | null>[] = [];
    let wrongTypeCount = 0;
    const names = new Set<string>();
    for (const item of dt.items) {
        if (item.kind !== 'file') continue;
        if (!suppotsFileSystemAccess.value) {
            const file = item.getAsFile();
            if (!file) {
                wrongTypeCount++;
                continue;
            }
            result1.push(file);
        } else {
            fsh.push(item.getAsFileSystemHandle());
        }
    }

    return (async () => {
        if (suppotsFileSystemAccess.value) {
            const handles = await Promise.all(fsh);
            for (const handle of handles) {
                if (!handle) continue;

                if (handle.kind === 'file' && props.type === 'filehandle') {
                    result2.push(handle as FileSystemFileHandle);
                } else if (handle.kind === 'directory') {
                    if (!props.recursiveReadDirectory) {
                        if (props.type === 'directory')
                            result3.push(handle as FileSystemDirectoryHandle);
                        else wrongTypeCount++;
                    } else {
                        let name = handle.name, n = 0;
                        while (names.has(name)) {
                            name = `${handle.name} (${++n})`;
                            if (n > 999) throw new Error('Too many directories with the same name');
                        }
                        names.add(name);
                        const files = await readdir(handle as FileSystemDirectoryHandle, name + '/');
                        for (const [name, handle] of files) {
                            if (props.type === 'file') {
                                // compatible mode
                                const file = (await (handle as FileSystemFileHandle).getFile());
                                result1.push(createFileNameProxy(file, name));
                            }
                            else result4.set(name, handle);
                        }
                    }
                } else if (handle.kind === 'file' && props.type === 'file') {
                    result1.push(await (handle as FileSystemFileHandle).getFile());
                } else {
                    wrongTypeCount++;
                }
            }
        }
        else return emit('file', result1); // if browser not support file system access, we can only get 'result1'

        if (wrongTypeCount > 0) {
            message.warn(t('common:ui.fileChooser.dnd.error.wrongType', { count: wrongTypeCount }));
        }

        if (props.type === 'file') {
            emit('file', result1);
        } else if (props.type === 'filehandle') {
            emit('filehandle', result2);
        } else if (props.type === 'directory') {
            if (props.recursiveReadDirectory) emit('directorycontent', result4);
            else emit('directory', result3);
        }
    })();
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
    z-index: 20001;
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
