<template>
    <div class="about-view">
        <h2 style="margin-top: 0;">{{ t('about:title') }}</h2>
        
        <a-card :title="t('about:sourceCode.title')" class="my-card">
            <p>{{ t('about:sourceCode.description') }}</p>
            <a-button type="link" :href="project_path" target="_blank">
                {{ t('about:sourceCode.viewOnGitHub') }}
            </a-button>
        </a-card>

        <a-card :title="t('about:version.title')" class="my-card" style="overflow: hidden">
            <p style="overflow: auto; white-space: nowrap;">{{ t('about:version.commit') }}: HEAD+{{ DYNDATA.commithash }}</p>
        </a-card>

        <a-card :title="t('about:license.title')" class="my-card">
            <p><a href="/resource/license.html" :title="t('about:license.title')" target="_blank" @click="openInternalLink">GPL-3.0</a> {{ t('about:license.text') }}</p>
        </a-card>

        <a-card :title="t('about:status.title')" class="my-card">
            <div>
                <b>{{ t('about:status.serviceWorkerStatus') }}</b>
                <StatusText :value="isSwActive" :activeText="t('about:status.active')" :inactiveText="t('about:status.notActive')" />
            </div>
        </a-card>

        <a-card :title="t('about:debugTools.title')" class="my-card">
            <a-space direction="vertical" :size="8" style="width: 100%;">
                <a-button 
                    block 
                    @click="router.push('/debug/file-browser')"
                >
                    <template #icon>
                        <FolderOpenOutlined />
                    </template>
                    {{ t('about:debugTools.fileBrowser') }}
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
import { project_path } from '@/config';
import { DYNDATA } from '@/dynamic';
import { t } from 'i18next';

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
