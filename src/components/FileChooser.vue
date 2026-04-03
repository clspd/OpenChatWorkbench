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

const supportsFileSystemAccess = computed(() => {
    return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window && typeof window.showOpenFilePicker === 'function' && typeof window.showDirectoryPicker === 'function';
});

defineExpose({
    fsSupported() {
        return supportsFileSystemAccess.value;
    },
    requestFile() {
        if (supportsFileSystemAccess.value) {
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

interface TransferItemSnapshot {
    file: File | null;
    handlePromise: Promise<FileSystemHandle | null> | null;
}

interface TransferBuckets {
    files: File[];
    fileHandles: FileSystemFileHandle[];
    directoryHandles: FileSystemDirectoryHandle[];
    directoryContent: Map<string, FileSystemFileHandle>;
    wrongTypeCount: number;
}

function snapshotDataTransfer(dt: DataTransfer): TransferItemSnapshot[] {
    const items: TransferItemSnapshot[] = [];

    for (const item of dt.items) {
        if (item.kind !== 'file') continue;

        const file = item.getAsFile();

        const handlePromise = (() => {
            const getter = (item as DataTransferItem & {
                getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
            }).getAsFileSystemHandle;
            if (typeof getter !== 'function') return null;
            try {
                return getter.call(item).catch(() => null);
            } catch {
                return null;
            }
        })();

        // 两者都没有就直接忽略这个 item
        if (!file && !handlePromise) continue;

        items.push({ file, handlePromise });
    }

    return items;
}

function uniqueName(base: string, used: Set<string>) {
    let name = base;
    let n = 0;
    while (used.has(name)) {
        name = `${base} (${++n})`;
        if (n > 999) throw new Error('Too many items with the same name');
    }
    used.add(name);
    return name;
}

function processDataTransfer(dt: DataTransfer) {
    const snapshots = snapshotDataTransfer(dt);

    return (async () => {
        const handles = await Promise.all(
            snapshots.map(item => item.handlePromise ?? Promise.resolve(null))
        );

        const buckets: TransferBuckets = {
            files: [],
            fileHandles: [],
            directoryHandles: [],
            directoryContent: new Map<string, FileSystemFileHandle>(),
            wrongTypeCount: 0,
        };

        const usedRootNames = new Set<string>();

        for (let i = 0; i < snapshots.length; i++) {
            const snapshot = snapshots[i]!; const { file } = snapshot;
            const handle = handles[i];

            // 优先 handle，handle 不可用时再 fallback 到 file
            if (handle) {
                if (handle.kind === 'file') {
                    if (props.type === 'filehandle') {
                        buckets.fileHandles.push(handle as FileSystemFileHandle);
                    } else if (props.type === 'file') {
                        buckets.files.push(await (handle as FileSystemFileHandle).getFile());
                    } else {
                        buckets.wrongTypeCount++;
                    }
                    continue;
                }

                if (handle.kind === 'directory') {
                    const dirHandle = handle as FileSystemDirectoryHandle;

                    if (props.recursiveReadDirectory) {
                        const rootName = uniqueName(dirHandle.name, usedRootNames);
                        const files = await readdir(dirHandle, rootName + '/');

                        if (props.type === 'file') {
                            for (const [name, fh] of files) {
                                const f = await fh.getFile();
                                buckets.files.push(createFileNameProxy(f, name));
                            }
                        } else if (props.type === 'directory') {
                            for (const [name, fh] of files) {
                                buckets.directoryContent.set(name, fh);
                            }
                        } else {
                            buckets.wrongTypeCount++;
                        }
                    } else {
                        if (props.type === 'directory') {
                            buckets.directoryHandles.push(dirHandle);
                        } else {
                            buckets.wrongTypeCount++;
                        }
                    }

                    continue;
                }

                buckets.wrongTypeCount++;
                continue;
            }

            // 没拿到 handle，就回退到 file
            if (file) {
                if (props.type === 'file') {
                    buckets.files.push(file);
                } else {
                    buckets.wrongTypeCount++;
                }
            } else {
                buckets.wrongTypeCount++;
            }
        }

        if (buckets.wrongTypeCount > 0) {
            message.warn(t('common:ui.fileChooser.dnd.error.wrongType', { count: buckets.wrongTypeCount }));
        }

        if (props.type === 'file') {
            emit('file', buckets.files);
        } else if (props.type === 'filehandle') {
            emit('filehandle', buckets.fileHandles);
        } else if (props.type === 'directory') {
            if (props.recursiveReadDirectory) emit('directorycontent', buckets.directoryContent);
            else emit('directory', buckets.directoryHandles);
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
