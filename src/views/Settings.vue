<template>
    <div class="settings-view">
        <template v-if="settingId === ''">
            <h2 style="margin-top: 0;">Settings</h2>

            <a-list bordered :data-source="pages">
                <template #renderItem="{ item }">
                    <a-list-item tabindex="0" class="settings-entrance"
                        @click="goSetting(item)" @keydown.enter="goSetting(item)">
                        {{ item.title }}
                    </a-list-item>
                </template>
            </a-list>
        </template>
        <ProviderSettings v-else-if="settingId === 'providers'"></ProviderSettings>
        <ModelSettings v-else-if="settingId === 'models'"></ModelSettings>
        <template v-else>
            <h2 style="margin-top: 0;">Error</h2>
            <p>SettingId: {{ settingId }} does not exist.</p>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { defineAsyncComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStateStore } from '@/stores/appState'

const ProviderSettings = defineAsyncComponent(() => import('@/settings/ProviderSettings.vue'))
const ModelSettings = defineAsyncComponent(() => import('@/settings/ModelSettings.vue'))

const props = defineProps({
    settingId: {
        type: String,
        default: '',
    },
})

const router = useRouter();

const pages = ref([
    {
        id: 'providers',
        title: 'Providers',
    },
    {
        id: 'models',
        title: 'Models',
    },
    {
        id: 'about',
        title: 'About',
        anotherPage: '/about/',
    },
])

onMounted(() => {
    if (props.settingId === '') useAppStateStore().setTitle('Settings')
})

const goSetting = (item: { id: string; anotherPage?: string }) => {
    if (item.anotherPage) router.push(item.anotherPage)
    else router.push(`/settings/${item.id}`);
}
</script>

<style scoped>
.settings-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1em;
}
.settings-entrance {
    cursor: pointer;
    background-color: var(--plain-btn-bg);
    transition: all .2s;
}
.settings-entrance:focus-visible {
    outline: 2px solid var(--plain-btn-focus-outline);
}
.settings-entrance:hover {
    background-color: var(--plain-btn-hover-bg);
}
.settings-entrance:active {
    background-color: var(--plain-btn-active-bg);
}
.settings-entrance:disabled {
    background-color: var(--plain-btn-disabled-bg);
}
</style>
