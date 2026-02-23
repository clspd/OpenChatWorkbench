<template>
    <div class="model-chooser">
        <a-tooltip>
            <template #title>
                {{ t('common:ui.modelChooser.title') }} - {{ selectedModel?.name || t('common:ui.modelChooser.notSelected') }} - {{ t('common:ui.modelChooser.tooltip') }}
            </template>
            <a-button @click="openModal" class="model-selector-btn" :disabled="props.disabled" aria-label="click to select model">
                <span v-if="selectedModel" class="model-name">
                    {{ selectedModel.name }}
                </span>
                <span v-else class="model-placeholder">
                    {{ t('common:ui.modelChooser.title') }}
                </span>
            </a-button>
        </a-tooltip>

        <dialog-view v-model="modalVisible" :close-on-click-mask="true" style="max-width: 500px; width: calc(100% - 2em);">
            <template #title>
                {{ t('common:ui.modelChooser.title') }}
            </template>
            <div class="model-selection" ref="modelSelectionRef" @scroll.passive="handleScroll">
                <div class="search-bar">
                    <a-input 
                        v-model:value="appStatePersist.modelChooserSearchKeyword" 
                        :placeholder="t('common:ui.modelChooser.filterTooltip')" 
                        allow-clear
                    >
                        <template #prefix>
                            <span>🔍</span>
                        </template>
                    </a-input>
                </div>
                <div class="filter-section">
                    <a-checkbox v-model:checked="showFavoritesOnly">
                        {{ t('common:ui.modelChooser.showFavOnly') }}
                    </a-checkbox>
                </div>
                <div v-if="groupedModels.length === 0" class="empty-state">
                    <p>{{ t('common:ui.modelChooser.emptyState') }}</p>
                    <div><a href="javascript:void(0)" @click="appState.showConfigGuide = true">{{ t('common:ui.modelChooser.openConfigGuide') }}</a></div>
                </div>
                <div v-else style="position: relative;">
                    <div :style="{ height: totalSize + 'px' }"></div>
                    <div v-for="item in virtualItems" :key="item.index" :style="{
                        top: `${item.start}px`
                    }"
                        :ref="el => { if (el) virtualizer.measureElement(el as Element) }"
                        class="vItem" :data-index="item.index"
                    >
                        <div v-if="groupedModels[item.index]?.type === 'provider'" 
                             class="provider-header">
                            <span class="provider-name">{{ (groupedModels[item.index] as any).data.name }}</span>
                            <a-tag :color="(groupedModels[item.index] as any).data.enabled ? 'green' : 'red'" size="small">
                                {{ (groupedModels[item.index] as any).data.enabled ? t('common:ui.state.enabled') : t('common:ui.state.disabled') }}
                            </a-tag>
                        </div>
                        <div v-else-if="groupedModels[item.index]?.type === 'model'"
                             class="model-item"
                             :class="{ 'selected': (props.modelId === (groupedModels[item.index] as any).data.id && props.providerId === (groupedModels[item.index] as any).data.provider_id) }"
                             tabindex="0" role="button"
                             @click="selectModel((groupedModels[item.index] as any).data.provider_id, (groupedModels[item.index] as any).data)"
                             @keydown.enter="selectModel((groupedModels[item.index] as any).data.provider_id, (groupedModels[item.index] as any).data)"
                        >
                            <div class="model-info">
                                <div class="model-id">{{ (groupedModels[item.index] as any).data.id }}</div>
                            </div>
                            <div class="model-actions">
                                <a-button 
                                    type="text" 
                                    size="small"
                                    @click.stop="toggleFavorite((groupedModels[item.index] as any).data.provider_id, (groupedModels[item.index] as any).data.id)"
                                    @keydown.enter.stop
                                    class="favorite-btn"
                                >
                                    <StarFilled v-if="configStore.isFavoriteModel((groupedModels[item.index] as any).data.provider_id, (groupedModels[item.index] as any).data.id)" class="star-icon filled" />
                                    <StarOutlined v-else class="star-icon" />
                                </a-button>
                                <CheckOutlined v-if="props.providerId === (groupedModels[item.index] as any).data.provider_id && props.modelId === (groupedModels[item.index] as any).data.id" class="check-icon" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </dialog-view>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { CheckOutlined, StarOutlined, StarFilled } from '@ant-design/icons-vue'
import { useConfigStore } from '@/stores/configStore'
import { useAppStateStore } from '@/stores/appState'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { DialogView } from 'vue-dialog-view'
import type { ModelConfig } from '@/types/config'
import { useVirtualizer } from '@tanstack/vue-virtual'

const props = defineProps({
    modelId: {
        type: String,
        default: ''
    },
    providerId: {
        type: String,
        default: ''
    },
    disabled: {
        type: Boolean,
        default: false
    },
})

const emit = defineEmits(['update:modelId', 'update:providerId'])

defineExpose({
    open: () => {
        modalVisible.value = true
    },
    close: () => {
        modalVisible.value = false
    },
})

const configStore = useConfigStore()
const appState = useAppStateStore()
const appStatePersist = useAppStatePersistStore()

const modalVisible = ref(false)
const modelSelectionRef = ref<HTMLElement | null>(null)
const showFavoritesOnly = computed({
    get: () => configStore.modelChooser_showFavoritesOnly,
    set: (value: boolean) => configStore.modelChooser_showFavoritesOnly = value
})

const selectedModel = computed(() => {
    if (!props.modelId || !props.providerId) return null
    const provider = configStore.getProviderById(props.providerId)
    if (!provider) return null
    const model = configStore.models.find(m => m.id === props.modelId)
    if (!model) return null
    return {
        name: `${model.id} - ${provider.name}`,
        ...model
    }
})

const groupedModels = computed(() => {
    if (!modalVisible.value) return []; // performance optimization
    return configStore.providers.filter(provider => provider.enabled).map(provider => {
        let models = configStore.models.filter(m => m.provider_id === provider.id)
        if (showFavoritesOnly.value) {
            models = models.filter(model =>
                configStore.isFavoriteModel(provider.id, model.id)
            )
        }
        if (appStatePersist.modelChooserSearchKeyword.trim()) {
            models = models.filter(model =>
                model.id.toLowerCase().includes(appStatePersist.modelChooserSearchKeyword.toLowerCase())
            )
        }

        return { provider, models }
    }).filter(group => group.models.length > 0).flatMap(item => [
        { type: "provider", data: item.provider },
        ...item.models.map(model => ({ type: "model", data: model }))
    ]);
})

const vOptions = computed(() => ({
    count: groupedModels.value.length,
    getScrollElement: () => (modelSelectionRef.value) || null,
    estimateSize: () => 50,
    overscan: 3,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

const openModal = () => {
    modalVisible.value = true
}

const selectModel = (providerId: string, model: ModelConfig) => {
    emit('update:providerId', providerId)
    emit('update:modelId', model.id)
    modalVisible.value = false
}

const toggleFavorite = (providerId: string, modelId: string) => {
    configStore.toggleFavoriteModel(providerId, modelId)
}

watch(modalVisible, async (newVal) => {
    if (newVal) {
        await nextTick()
        await nextTick()
        if (modelSelectionRef.value) {
            modelSelectionRef.value.scrollTop = appStatePersist.modelChooserScrollPos
        }
    }
})

const handleScroll = () => {
    if (modelSelectionRef.value && modalVisible.value) {
        appStatePersist.modelChooserScrollPos = modelSelectionRef.value.scrollTop
    }
}
</script>

<style scoped>
.model-chooser {
    display: inline-block;
}

.model-selector-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 200px;
    padding: 4px 12px;
    height: auto;
    text-align: left;
}

.model-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-placeholder {
    color: #999;
    flex: 1;
}

.dropdown-icon {
    margin-left: 8px;
    transition: transform 0.3s;
}

.model-selection {
    max-height: 500px;
    overflow-y: auto;
    position: relative;
}

.search-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--background);
    padding: 0.5em 0;
    margin-bottom: 0.5em;
}

.filter-section {
    margin-bottom: 0.5em;
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #999;
}

.vItem {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
}

.provider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 12px;
    position: relative;
}

.provider-name {
    font-weight: 500;
    font-size: 14px;
}

.model-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    margin-bottom: 8px;
}

.model-item:hover {
    border-color: #1890ff;
    background-color: #f0f5ff;
}

.model-item.selected {
    border-color: #1890ff;
    background-color: #e6f7ff;
}

.model-info {
    flex: 1;
}

.model-id {
    font-weight: 500;
}

.model-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

.favorite-btn {
    padding: 4px;
    color: #999;
}

.favorite-btn:hover {
    color: #faad14;
}

.star-icon {
    font-size: 16px;
}

.star-icon.filled {
    color: #faad14;
}

.check-icon {
    color: #1890ff;
    font-size: 16px;
}

.model-selection::-webkit-scrollbar {
    width: 8px;
}

.model-selection::-webkit-scrollbar-track {
    background-color: #f5f5f5;
}

.model-selection::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 4px;
}

.model-selection::-webkit-scrollbar-thumb:hover {
    background-color: #999;
}
</style>
