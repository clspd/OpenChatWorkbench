<template>
    <div class="about-view">
        <h2 style="margin-top: 0;">About OpenChatWorkbench</h2>
        
        <a-card title="Source code" class="my-card">
            <p>OpenChatWorkbench is open-source software available on GitHub.</p>
            <a-button type="link" href="https://github.com/clspd/OpenChatWorkbench" target="_blank">
                View on GitHub
            </a-button>
        </a-card>

        <a-card title="License" class="my-card">
            <p>GPL-3.0 License</p>
        </a-card>

        <a-card title="Status" class="my-card">
            <div>
                <b>Service Worker status:</b>
                <StatusText :value="isSwActive" activeText="Active" inactiveText="Not Active" />
            </div>
        </a-card>

        <a-card title="Debug Tools" class="my-card">
            <a-space direction="vertical" :size="8" style="width: 100%;">
                <a-button 
                    block 
                    @click="router.push('/debug/file-browser')"
                >
                    <template #icon>
                        <FolderOpenOutlined />
                    </template>
                    File Browser
                </a-button>
            </a-space>
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import { useAppStateStore } from '@/stores/appState'
import { isServiceWorkerActive } from '@/utils/swApi';
import StatusText from '@/components/StatusText.vue'

const router = useRouter()

const isSwActive = ref(false)

onMounted(async () => {
    useAppStateStore().setTitle('About')
    isSwActive.value = await isServiceWorkerActive()
})
</script>

<style scoped>
.about-view {
    margin: 1em;
}
.my-card + .my-card {
    margin-top: 1em;
}
.status-text {
    margin-left: 0.5em;
}
</style>
