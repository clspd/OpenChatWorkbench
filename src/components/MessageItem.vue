<template>
    <div class="message-item-container">
        <template v-if="
    props.message.role === MessageRole.System ||
    props.message.role === MessageRole.User || 
    props.message.role === MessageRole.Assistant">
            <div class="message-fill" v-if="props.message.role === MessageRole.User || props.message.role === MessageRole.System">&NoBreak;</div>
            <div class="message-item" :data-role="msgRoleIdentifyMap[props.message.role]">
                <div class="message-avatar" v-if="appStatePersist.showAvatar !== 'off'">
                    <div class="message-avatar-icon" v-if="appStatePersist.showAvatar === 'default' || avatarUrl === 'N/A'">
                        <UserOutlined @click="confirmEditAvatar" v-if="props.message.role === MessageRole.User" />
                        <RobotOutlined @click="confirmEditAvatar" v-if="props.message.role === MessageRole.Assistant" />
                        <SettingOutlined @click="confirmEditAvatar" v-if="props.message.role === MessageRole.System" />
                    </div>
                    <div class="message-avatar-icon" v-else-if="appStatePersist.showAvatar === 'custom'">
                        <img @click="confirmEditAvatar" v-if="avatarUrl" :src="avatarUrl" :alt="props.message.role" />
                    </div>
                </div>

                <MessageFileReferences
                    v-if="props.message.files.length > 0"
                    class="f-reference"
                    :references="props.message.files"
                    :can-remove="false"
                    :disabled="props.disabled"
                    :align="(props.message.role === MessageRole.User || props.message.role === MessageRole.System) ? 'right' : 'left'"
                />

                <div class="message-body-container" v-show="!isFileOnly">
                    <div class="message-fill"></div>
                    <div class="message-body">
                        <MessageContentRenderer :message="props.message" :show-raw="props.showRaw" />
                    </div>
                </div>
            </div>
        </template>
        <div v-else class="err-unsupported-message">
            This message role is not supported.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { MessageContentType, MessageRole, type Message } from '@/types/message';
import { msgRoleIdentifyMap } from "@/modules/chat/msgRoleMap";
import MessageContentRenderer from './MessageContentRenderer.vue';
import { GetCustomAvatarUrl } from '@/utils/userCustomAvatar';
import { Modal } from 'ant-design-vue';
import { t } from 'i18next';
import { useRouter } from 'vue-router';
import MessageFileReferences from './MessageFileReferences.vue';

const appStatePersist = useAppStatePersistStore();
const router = useRouter();

const props = defineProps<{
    message: Message;
    showRaw?: boolean;
    disabled?: boolean;
}>();

const avatarUrl = ref('');
const msgRole2StorageRole: Record<string, string> = {
    [MessageRole.User]: 'user',
    [MessageRole.Assistant]: 'assistant',
    [MessageRole.System]: 'system',
}

const isFileOnly = computed(() => props.message.files.length > 0 && props.message.fragments.length === 1 && props.message.fragments[0]!.contentType === MessageContentType.Text && props.message.fragments[0]!.content === '');

onMounted(() => {
    if (appStatePersist.showAvatar === 'custom') {
        const role = msgRole2StorageRole[props.message.role];
        if (role) GetCustomAvatarUrl(role).then(url => avatarUrl.value = url).catch(() => avatarUrl.value = 'N/A');
    }
});

const confirmEditAvatar = () => {
    Modal.confirm({
        title: t("chat:messageOperations.editAvatar.title"),
        content: t("chat:messageOperations.editAvatar.content"),
        okText: t("common:ui.dialog.ok"),
        cancelText: t("common:ui.dialog.cancel"),
        onOk() {
            router.push("/settings/personalization");
        },
    })
}

</script>

<style scoped>
.message-item-container {
    overflow: hidden;
    display: flex;
}

.message-item {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
}

.message-item .message-avatar {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
    cursor: pointer;
}

.message-fill {
    flex: 1;
}

.message-item[data-role="system"],
.message-item[data-role="user"] {
    flex: unset;
}
.message-item[data-role="system"] .message-avatar,
.message-item[data-role="user"] .message-avatar {
    text-align: right;
}

.message-avatar-icon > :deep(*) {
    padding: 5px;
    border-radius: 50%;
    aspect-ratio: 1;
    border: 1px solid gray;
    font-size: 2em;
}

.message-avatar-icon > img {
    width: 40px;
    height: 40px;
    padding: 0;
}

.f-reference {
    margin-bottom: 0.5em;
    max-width: 50em;
}

.message-body-container {
    display: flex;
}

/* Message body:
show user message as bubble 
show assistant message as text
*/
.message-item[data-role="system"] > * > .message-body,
.message-item[data-role="user"] > * > .message-body {
    padding: 0.5em;
    border-radius: 1em;
    background-color: var(--message-bgcolor);
}
.message-item[data-role="user"] > * > .message-body {
    --message-bgcolor: var(--message-user-bgcolor, #e0ebff);
}
.message-item[data-role="system"] > * > .message-body {
    --message-bgcolor: var(--message-system-bgcolor, #f0f0f0);
}

</style>
