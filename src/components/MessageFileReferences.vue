<template>
   <div class="file-reference-container" ref="container" @wheel.prevent="transformWheel">
        <div v-if="props.align === 'right'" style="flex: 1;" aria-hidden="true"></div>
        <div v-if="props.canRemove && props.references.length > 5" class="file-reference-item" @click.stop="!props.disabled && emit('remove-all')">
            <a-button type="text" danger @click.stop="!props.disabled && emit('remove-all')" :disabled="props.disabled">
                {{ t("common:ui.mainInput.removeAllAttaLabel") }}
            </a-button>
        </div>
        <div v-for="file in props.references" :key="file.id" class="file-reference-item" role="link" tabindex="0" @click="previewFile(file.id)" @keydown.self.enter.prevent="previewFile(file.id)" :data-disabled="props.disabled">
            <div class="file-icon">
                <FileOutlined />
            </div>
            <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-size">{{ file.size }}B</div>
            </div>
            <div class="file-operation" @click.stop @keydown.stop>
                <a-button type="text" shape="circle" @click.stop="emit('remove-file', file.id)" v-if="props.canRemove" :disabled="props.disabled">
                    <CloseOutlined />
                </a-button>
            </div>
        </div>
        <div v-if="hasUploading" class="file-reference-item">
            {{ t("common:ui.mainInput.uploading") }}
        </div>
        <div v-else-if="props.references.length > 5" class="file-reference-item" @click="scrollToStart" @keydown.enter.prevent="scrollToStart">
            <ArrowLeftOutlined />
        </div>

        <DialogView v-if="showPreview" v-model="showPreview" class="preview-dialog" close-on-click-mask>
            <template #title>{{ t("chat:messageChain.files.previewDlg.title") }}</template>
            <common-file-preview class="preview-body" ref="previewElement" :data-auto-wrap="autowrapEnabled" />
            <div class="preview-floating-buttons">
                <a-button aria-label="Toggle auto wrap" shape="circle" @click="autowrapEnabled = !autowrapEnabled">
                    <SwapRightOutlined v-if="autowrapEnabled" />
                    <EnterOutlined v-else />
                </a-button>
                <a-button type="primary" aria-label="Download" shape="circle" @click="downloadCurrentFile"><DownloadOutlined /></a-button>
            </div>
        </DialogView>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { FileAttachmentInfo } from '@/types/message';
import { DialogView } from 'vue-dialog-view';
import { nextTick } from 'vue';
import { message } from 'ant-design-vue';
import "common-file-preview";
import { t } from 'i18next';
import { HTMLCommonFilePreviewElement } from 'common-file-preview';
import { GetAttachmentById } from '@/modules/chat/attachment';
import { useAppStatePersistStore } from '@/stores/appStatePersist';

const appStatePersist = useAppStatePersistStore();

const props = withDefaults(defineProps<{
    references: FileAttachmentInfo[],
    hasUploading?: boolean,
    canRemove?: boolean,
    disabled?: boolean,
    align?: 'left' | 'right',
}>(), {
    hasUploading: false,
    canRemove: true,
    disabled: false,
    align: 'left',
});

const emit = defineEmits<{
    (e: 'remove-file', fileId: string): void;
    (e: 'remove-all'): void;
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
const showPreview = ref(false);
const previewId = ref("");

const transformWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!container.value) return;
    container.value.scrollTo({
        left: container.value.scrollLeft + e.deltaY,
        behavior: 'instant',
    })
}

const scrollToStart = () => {
    if (container.value) {
        container.value.scrollTo({
            left: 0,
            behavior: 'smooth',
        })
    }
}

const previewElement = ref<HTMLCommonFilePreviewElement>();

const previewFile = (id: string) => {
    if (props.disabled) return;
    previewId.value = id;
    showPreview.value = true;
}

const tempObjUrl = ref("");
const autowrapEnabled = computed({
    get: () => appStatePersist.filePreview.autoWrap,
    set: (newVal) => appStatePersist.filePreview.autoWrap = newVal,
});

onBeforeUnmount(() => {
    if (tempObjUrl.value) {
        URL.revokeObjectURL(tempObjUrl.value);
        tempObjUrl.value = "";
    }
});

watch(() => showPreview.value, (newValue) => {
    if (newValue) nextTick(async () => {
        try {
            if (!previewElement.value) throw "Preview element not found";
            const info = props.references.find((item) => item.id === previewId.value);
            if (!info) throw "File info not found";
            const file = await GetAttachmentById(previewId.value);
            if (tempObjUrl.value) {
                URL.revokeObjectURL(tempObjUrl.value);
                tempObjUrl.value = "";
            }
            tempObjUrl.value = URL.createObjectURL(file);
            await previewElement.value.init(
                async () => tempObjUrl.value,
                info.type.startsWith('image/') ? info.type : 'text/plain',
                info.name);
        }
        catch (e) {
            showPreview.value = false;
            message.error(t("chat:messageChain.files.errors.preview") + e);
        }
    })
})

const downloadCurrentFile = async () => {
    if (!previewId.value) return;
    try {
        const info = props.references.find((item) => item.id === previewId.value);
        if (!info) return;
        const file = await GetAttachmentById(previewId.value);
        const tempUrl = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = tempUrl;
        a.download = info.name;
        a.hidden = true;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(tempUrl);
        }, 1000);
    }
    catch (e) {
        showPreview.value = false;
        message.error(t("chat:messageChain.files.errors.download") + e);
    }
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

.file-reference-item[data-disabled="true"] {
    cursor: not-allowed;
}

.file-reference-item:hover {
    background-color: var(--file-reference-hover-bg-color, #f0f0f0);
}

.preview-dialog {
    width: 100%;
    height: 100%;
}

.preview-body {
    flex: 1;
    --padding: 0;
}

.preview-floating-buttons {
    position: absolute;
    bottom: 10px;
    right: 10px;
    display: flex;
    gap: 0.5em;
}

.preview-body[data-auto-wrap="true"] {
    --white-space: pre-wrap;
    overflow-wrap: anywhere;
}
</style>
