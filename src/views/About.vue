<template>
    <div class="about-view">
        <h2 style="margin-top: 0;">About OpenChatWorkbench</h2>

        <a-card class="info-card">
            <a-descriptions bordered :column="1">
                <a-descriptions-item label="Name">
                    OpenChatWorkbench
                </a-descriptions-item>
                <a-descriptions-item label="Version">
                    0.0.0
                </a-descriptions-item>
                <a-descriptions-item label="Description">
                    A powerful AI chat workbench for managing multiple AI providers and models
                </a-descriptions-item>
            </a-descriptions>
        </a-card>

        <a-card title="Features" class="features-card">
            <ul class="feature-list">
                <li>Manage multiple AI providers (OpenAI, DeepSeek, etc.)</li>
                <li>Configure and organize AI models by provider</li>
                <li>Favorite and filter your preferred models</li>
                <li>File browser with CRUD operations</li>
                <li>Rich text editor with Tiptap</li>
            </ul>
        </a-card>

        <a-card title="Tech Stack" class="tech-card">
            <a-space direction="vertical" :size="8" style="width: 100%;">
                <div class="tech-item">
                    <strong>Framework:</strong> Vue 3.5.26
                </div>
                <div class="tech-item">
                    <strong>UI Library:</strong> Ant Design Vue 4.2.6
                </div>
                <div class="tech-item">
                    <strong>State Management:</strong> Pinia 3.0.4
                </div>
                <div class="tech-item">
                    <strong>Router:</strong> Vue Router 4.6.4
                </div>
                <div class="tech-item">
                    <strong>Editor:</strong> Tiptap 3.14.0
                </div>
                <div class="tech-item">
                    <strong>File System:</strong> ZenFS 2.4.4
                </div>
                <div class="tech-item">
                    <strong>Build Tool:</strong> Vite (rolldown-vite)
                </div>
                <div class="tech-item">
                    <strong>Language:</strong> TypeScript 5.9.3
                </div>
            </a-space>
        </a-card>

        <a-card title="License" class="license-card">
            <p>GPL-3.0 License</p>
        </a-card>

        <a-card title="Debug Tools" class="debug-card">
            <a-space direction="vertical" :size="8" style="width: 100%;">
                <a-button 
                    type="primary" 
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
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FolderOpenOutlined } from '@ant-design/icons-vue';
import { useAppStateStore } from '@/stores/appState'

const router = useRouter()

onMounted(() => {
    useAppStateStore().setTitle('About')
})
</script>

<style scoped>
.about-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1em;
    gap: 1em;
}

.info-card,
.features-card,
.tech-card,
.license-card,
.debug-card {
    background-color: var(--plain-btn-bg);
}

.feature-list {
    margin: 0;
    padding-left: 1.5em;
}

.feature-list li {
    margin-bottom: 0.5em;
}

.tech-item {
    padding: 4px 0;
}
</style>
