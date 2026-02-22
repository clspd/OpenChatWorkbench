<template>
    <div class="settings-view">
        <template v-if="settingId === ''">
            <h2 style="margin-top: 0;">{{ t('settings:title') }}</h2>

            <a-list bordered :data-source="pages">
                <template #renderItem="{ item }">
                    <a-list-item tabindex="0" class="settings-entrance"
                        @click="goSetting(item)" @keydown.enter="goSetting(item)">
                        {{ item.title }}
                    </a-list-item>
                </template>
            </a-list>
        </template>
        <component v-if="currentComponent" :is="currentComponent" />
        <template v-if="!isValidPage">
            <h2 style="margin-top: 0;">Error</h2>
            <p>SettingId: {{ settingId }} does not exist.</p>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, watch } from 'vue';
import { defineAsyncComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStateStore } from '@/stores/appState'
import i18next from 'i18next';

const GeneralSettings = defineAsyncComponent(() => import('@/settings/GeneralSettings.vue'))
const PersonalizationSettings = defineAsyncComponent(() => import('@/settings/Personalization.vue'))
const ProviderSettings = defineAsyncComponent(() => import('@/settings/ProviderSettings.vue'))
const ModelSettings = defineAsyncComponent(() => import('@/settings/ModelSettings.vue'))
const CacheSettings = defineAsyncComponent(() => import('@/settings/CacheSettings.vue'))
const DataManagementSettings = defineAsyncComponent(() => import('@/settings/DataManagementSettings.vue'))

const props = defineProps({
    settingId: {
        type: String,
        default: '',
    },
})

const router = useRouter();
const currentComponent = ref<any>(null);
const isValidPage = computed(() => (props.settingId === '' || pages.value.find((item: any) => item.id === props.settingId)));
const pages = ref([
    {
        id: 'general',
        title: i18next.t('settings:general.title'),
        component: markRaw(GeneralSettings),
    },
    {
        id: 'personalization',
        title: i18next.t('settings:personalization.title'),
        component: markRaw(PersonalizationSettings),
    },
    {
        id: 'providers',
        title: i18next.t('settings:provider.title'),
        component: markRaw(ProviderSettings),
    },
    {
        id: 'models',
        title: i18next.t('settings:model.title'),
        component: markRaw(ModelSettings),
    },
    {
        id: 'cache',
        title: i18next.t('settings:cache.title'),
        component: markRaw(CacheSettings),
    },
    {
        id: 'data-management',
        title: i18next.t('settings:data_management.title'),
        component: markRaw(DataManagementSettings),
    },
    {
        id: 'about',
        title: i18next.t('settings:about'),
        anotherPage: '/about/',
    },
])

onMounted(() => {
    if (props.settingId === '') useAppStateStore().setTitle('Settings')
})

const goSetting = (item: { id: string; anotherPage?: string }) => {
    if (item.anotherPage) { router.push(item.anotherPage); return }
    router.push(`/settings/${item.id}`);
}
watch(() => props.settingId, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        currentComponent.value = pages.value.find((item: any) => item.id === newVal)?.component;
    }
    if (props.settingId === '') useAppStateStore().setTitle('Settings')
}, { immediate: true })
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
