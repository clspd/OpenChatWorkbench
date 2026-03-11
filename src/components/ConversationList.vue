<template>
    <div class="message-list" ref="msgList">
        <div v-if="displayContent.length === 0" class="empty">
            <a-empty description="" />
        </div>
        <div v-else class="conversation-vlist-wrapper">
            <div v-for="vi in virtualItems" :key="vi.index" class="vItem" :data-index="vi.index" :style="{ top: vi.start + 'px' }" :ref="el => { if (el) virtualizer.measureElement(el as Element) }">
                <div :data-index="vi.index" v-if="displayContent[vi.index]?.type === 'text-mark'" class="group-label">{{ (displayContent[vi.index] as FlattenedConversationIndexItemTextMark).content }}</div>
                <a :data-index="vi.index" v-else-if="displayContent[vi.index]?.type === 'conversation'"
                    class="conversation-item"
                    :class="{ 'is-selected': isActive((displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.id) }"
                    role="presentation"
                    tabindex="-1"
                    :href="getConversationUrl((displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.id)"
                    @click="handleConversationClick((displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.id)">
                    <div class="conversation-info" tabindex="0" role="link">
                        <div class="conversation-title">{{ (displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.title }}</div>
                        <div class="conversation-meta">
                            <span class="conversation-time">{{ formatConversationTime((displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.updated_at) }}</span>
                        </div>
                    </div>
                    <div class="conversation-operations">
                        <a-dropdown :trigger="['click']">
                            <template #overlay>
                                <a-menu @click="handleConvMenuClick($event.key, vi.index)">
                                    <a-menu-item key="rename">
                                        <EditOutlined />
                                        {{ t('common:ui.sidebar.conversation.operations.rename') }}
                                    </a-menu-item>
                                    <a-menu-item key="pin">
                                        <template v-if="(displayContent[vi.index] as FlattenedConversationIndexItemConversation).content.pinned">
                                            <ExportOutlined />
                                            {{ t('common:ui.sidebar.conversation.operations.unpin') }}
                                        </template>
                                        <template v-else>
                                            <PushpinOutlined />
                                            {{ t('common:ui.sidebar.conversation.operations.pin') }}
                                        </template>
                                    </a-menu-item>
                                    <a-menu-item key="export">
                                        <DownloadOutlined />
                                        {{ t('common:ui.sidebar.conversation.operations.export') }}
                                    </a-menu-item>
                                    <a-menu-divider />
                                    <a-menu-item key="delete" style="color: var(--danger-color, #ff4d4f);">
                                        <DeleteOutlined />
                                        {{ t('common:ui.sidebar.conversation.operations.delete') }}
                                    </a-menu-item>
                                </a-menu>
                            </template>
                            <a-button shape="circle" type="text" class="trigger-button" @click.prevent.stop aria-label="Conversation operations…">
                                <EllipsisOutlined />
                            </a-button>
                        </a-dropdown>
                    </div>
                </a>
                <div :data-index="vi.index" v-else-if="displayContent[vi.index]?.type === 'has-more-mark'" class="has-more-mark">
                    Has more data (TODO: load these data...)
                </div>
            </div>
        </div>

        <DialogView v-model="showProgressDialog" :closable="false">
            <template #title>{{ t('common:ui.sidebar.progress.title') }}</template>
            <div>{{ t('common:ui.sidebar.progress.content') }}</div>
        </DialogView>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { DialogView } from 'vue-dialog-view'
import { useConversationStore } from '@/stores/conversationStore'
import { formatConversationTime } from '@/utils/conversationGroup'
import { useWindowStateStore } from '@/stores/windowState'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { FlattenedConversationIndexItem, FlattenedConversationIndexItemConversation, FlattenedConversationIndexItemTextMark } from '@/types/conversation'
import { handleRequestDeleteConversation, handleRequestRenameConversation } from '@/modules/ui-utils/convManager'
import { LoadConversationPreference } from '@/modules/chat/convPref'
import { getConvPath, getConvPrefPath } from '@/modules/chat/path'
import { UpdateConversationInfo } from '@/modules/chat/conversation'
import { fs } from '@/userdata'
import { t } from 'i18next'

const router = useRouter()
const route = useRoute()
const conversationStore = useConversationStore()
const props = defineProps({
    type: {
        type: String,
        default: 'chat'
    },
    filter: {
        type: String,
        default: ''
    },
})
const emit = defineEmits(['initialized'])

const conversationGroupsData = computed(() => {
    return conversationStore.groupedConversationsList
});
const flattenedConversations = computed<FlattenedConversationIndexItem[]>(() => {
    const result: FlattenedConversationIndexItem[] = []
    for (const i of conversationGroupsData.value.groups) {
        result.push({ type: "text-mark", content: i.label })
        for (const j of i.conversations) {
            result.push({ type: "conversation", content: j })
        }
    }
    if (conversationGroupsData.value.has_more) {
        result.push({ type: "has-more-mark" })
    }
    return result
});

const flattenedWorkspaces: any = ref([]); // TODO

const displayContent = computed(() => {
    const realData = props.type === 'workspace' ? flattenedWorkspaces.value : flattenedConversations.value;
    return props.filter ? realData.filter((i: FlattenedConversationIndexItem) => i.type === 'conversation' && i.content.title.includes(props.filter)) : realData;
})

const msgList = ref<HTMLDivElement>();

const vOptions = computed(() => ({
    count: displayContent.value.length,
    getScrollElement: () => msgList.value?.parentElement || null,
    estimateSize: () => 52.625,
    overscan: 5,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

const handleConversationClick = (conversationId: string) => {
    router.push(`/chat/c/${conversationId}`)
    if (!useWindowStateStore().isLargeScreen) {
        useAppStatePersistStore().sidebarCollapsed = true
    }
}

const getConversationUrl = (conversationId: string): string => {
    return new URL(router.resolve(`/chat/c/${conversationId}`).href, new URL(router.options.history.base, window.location.href)).href
}

const isActive = (conversationId: string): boolean => {
    return route.params.chatId === conversationId
}

onMounted(async () => {
    emit('initialized')
})

const showProgressDialog = ref(false);

const handleConvMenuClick = (key: string, index: number) => {
    switch (key) {
        case 'delete':
            if (displayContent.value[index]?.type === 'conversation') {
                handleRequestDeleteConversation(displayContent.value[index].content.id, true, router);
            }
            break;
        case 'rename':
            if (displayContent.value[index]?.type === 'conversation') {
                (import("@/utils/prompt")).then(({ prompt }) => prompt(
                    t("common:conversation.rename.content"), t("common:conversation.rename.title"), (displayContent.value[index] as FlattenedConversationIndexItemConversation).content.title
                ).then(v => {
                    if (null == v) return;
                    if (!v) return message.error(t("common:conversation.rename.emptyNameErr"));
                    if (v.length > 256) return message.error(t("common:conversation.rename.nameTooLongErr", { n: 256 }));
                    handleRequestRenameConversation((displayContent.value[index] as FlattenedConversationIndexItemConversation).content.id, v);
                }));
            }
            break;
        case 'pin':
            if (displayContent.value[index]?.type === 'conversation') {
                const id = (displayContent.value[index] as FlattenedConversationIndexItemConversation).content.id;
                LoadConversationPreference(id).then(pref => {
                    return UpdateConversationInfo(id, undefined, !pref.pinned);
                }).catch(e => {
                    message.error("Failed to update conversation preference: " + e);
                });
            }
            break;
        case 'export':
            if (displayContent.value[index]?.type !== 'conversation') 
                return message.error("Only conversations can be exported.");
            showProgressDialog.value = true;
            import('fflate').then(async ({ zip }) => {
                const id = (displayContent.value[index] as FlattenedConversationIndexItemConversation).content.id;
                const msgFile = await fs.readFile(getConvPath(id));
                const prefFile = await fs.readFile(getConvPrefPath(id));
                const zipFile = await new Promise<Uint8Array<ArrayBuffer>>((r, j) => zip({
                    [id + ".json"]: msgFile,
                    [id + ".pref.json"]: prefFile,
                }, {}, (err, data) => err ? j(err) : r(data as Uint8Array<ArrayBuffer>)));
                const blob = new Blob([zipFile], { type: "application/zip" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = id + ".zip";
                a.click();
                document.body.appendChild(a);
                setTimeout(() => {
                    a.remove();
                    URL.revokeObjectURL(url);
                }, 1000);
                message.success("Conversation exported successfully");
            }).catch(e => {
                message.error("Failed to export conversation: " + e);
            }).finally(() => {
                showProgressDialog.value = false;
            });
            break;
        default: ;
    }
}
</script>

<style scoped>
/* .message-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
} */

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2em;
    color: var(--text-secondary);
}

.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2em;
    color: var(--text-secondary);
}

.vItem {
    position: absolute;
    width: calc(100% - 1em);
    box-sizing: border-box;
    overflow: hidden;
}

.conversation-vlist-wrapper {
    padding: 0.5em;
}

.group-label {
    padding: 1em 0.5em 1em 0.5em;
    font-size: 0.85em;
    font-weight: 600;
}

.conversation-item {
    display: block;
    margin-bottom: 0.5em;
    padding: 0.5em;
    border-radius: 0.5em;
    cursor: pointer;
    text-decoration: none !important;
    transition: background-color 0.2s;
    border: 1px solid transparent;
    overflow: hidden;
    display: flex;
    background-color: var(--app-message-list-conversation-item-bg);
    color: var(--app-message-list-conversation-item-text-color);
}

.conversation-item:hover {
    background-color: var(--app-message-list-conversation-hover-bg);
}

.conversation-item:active {
    background-color: var(--app-message-list-conversation-active-bg);
    color: var(--app-message-list-conversation-active-text-color);
}

.conversation-item:focus-visible {
    outline: 2px solid var(--app-message-list-conversation-focus-outline);
}

.conversation-item.is-selected {
    background-color: var(--app-message-list-conversation-selected-bg);
    color: var(--app-message-list-conversation-selected-text-color);
}

.conversation-info {
    flex: 1;
    overflow: hidden;
}

.conversation-info > .conversation-title {
    font-size: small;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conversation-info > .conversation-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.25em;
    font-size: 0.75em;
    color: var(--text-secondary);
}

.conversation-info > .conversation-meta > .conversation-time {
    font-size: 0.75em;
    opacity: 0.8;
}

.conversation-item > .conversation-operations {
    margin-left: 0.5em;
    font-size: small;
}
.conversation-item > .conversation-operations > .trigger-button :deep(svg) {
    fill: transparent;
    transition: fill 0.2s;
}
.conversation-item:hover > .conversation-operations > .trigger-button :deep(svg),
.conversation-item:focus-within > .conversation-operations > .trigger-button :deep(svg),
.conversation-item:focus-visible > .conversation-operations > .trigger-button :deep(svg),
.conversation-item.is-selected > .conversation-operations > .trigger-button :deep(svg) {
    fill: currentColor;
}
</style>
