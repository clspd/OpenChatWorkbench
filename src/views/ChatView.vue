<template>
    <div class="chat-view">
        <div v-if="notFound || !conversation" class="empty-view">
            <div class="empty-view-content">
                <CloseCircleFilled style="font-size: 64px; color: #ff4d4f;" />
                <h1>Conversation Not Found</h1>
                <div><a-button type="primary" @click="router.push('/')">Go to Home</a-button></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import { LoadConversation } from '@/modules/chat/conversation';
import { useAppStateStore } from '@/stores/appState';
import type { Conversation } from '@/types/conversation';
import { CloseCircleFilled } from '@ant-design/icons-vue';
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
    chatId: {
        type: String,
        default: '',
    },
});

const appStateStore = useAppStateStore()
const notFound = ref(false)

const conversation = ref<Conversation>();

watch(() => props.chatId, (newVal) => {
    queueMicrotask(() => LoadChat().finally(() => {
        if (conversation.value && conversation.value.session.title) {
            appStateStore.setTitle(conversation.value.session.title)
        } else {
            appStateStore.setTitle('Chat')
        }
    }))
}, { immediate: true });

async function LoadChat() {
    if (!props.chatId) {
        conversation.value = undefined
        notFound.value = true;
        return;
    }

    try {
        conversation.value = await LoadConversation(props.chatId);
        notFound.value = false;
    } catch {
        conversation.value = undefined
        notFound.value = true;
        return;
    }
}


</script>

<style scoped>
.chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.empty-view {
    width: 100%;
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    text-align: center;
}

.empty-view-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: auto;
}
</style>
