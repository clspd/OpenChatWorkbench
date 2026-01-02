<template>
    <div class="model-chooser">
        <a-button @click="openModal" class="model-selector-btn">
            <span v-if="selectedModel" class="model-name">
                {{ selectedModel.name }}
            </span>
            <span v-else class="model-placeholder">
                Select Model
            </span>
        </a-button>

        <dialog-view v-model="modalVisible" style="max-width: 500px; width: calc(100% - 2em);">
            <template #title>
                Select Model
            </template>
            <div class="model-selection" ref="modelSelectionRef">
                <div class="search-bar">
                    <a-input 
                        v-model:value="searchKeyword" 
                        placeholder="Filter by model ID..." 
                        allow-clear
                    >
                        <template #prefix>
                            <span>🔍</span>
                        </template>
                    </a-input>
                </div>
                <div class="filter-section">
                    <a-checkbox v-model:checked="showFavoritesOnly">
                        Show favorites only
                    </a-checkbox>
                </div>
                <div v-if="groupedModels.length === 0" class="empty-state">
                    <p>No models available. Please add providers and models first.</p>
                </div>
                <div v-else>
                    <div v-for="group in groupedModels" :key="group.provider.id" class="provider-group">
                        <div class="provider-header">
                            <span class="provider-name">{{ group.provider.name }}</span>
                            <a-tag :color="group.provider.enabled ? 'green' : 'red'" size="small">
                                {{ group.provider.enabled ? 'Enabled' : 'Disabled' }}
                            </a-tag>
                        </div>
                        <div class="model-list" v-if="group.provider.enabled">
                            <template v-for="model in group.models" >
                                <div 
                                    v-if="model.enabled"
                                    :key="model.id"
                                    class="model-item"
                                    :class="{ 'selected': props.modelId === model.id }"
                                    @click="selectModel(model, group.provider.id)"
                                >
                                    <div class="model-info">
                                        <div class="model-id">{{ model.id }}</div>
                                    </div>
                                    <div class="model-actions">
                                        <a-button 
                                            type="text" 
                                            size="small"
                                            @click.stop="toggleFavorite(group.provider.id, model.id)"
                                            class="favorite-btn"
                                        >
                                            <StarFilled v-if="configStore.isFavoriteModel(group.provider.id, model.id)" class="star-icon filled" />
                                            <StarOutlined v-else class="star-icon" />
                                        </a-button>
                                        <CheckOutlined v-if="props.modelId === model.id" class="check-icon" />
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </dialog-view>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { DownOutlined, CheckOutlined, StarOutlined, StarFilled } from '@ant-design/icons-vue'
import { useConfigStore } from '@/stores/configStore'
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { DialogView } from 'vue-dialog-view'

const props = defineProps({
    modelId: {
        type: String,
        default: ''
    },
    providerId: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['update:modelId', 'update:providerId'])

const configStore = useConfigStore()
const appStatePersistStore = useAppStatePersistStore()

const modalVisible = ref(false)
const searchKeyword = ref('')
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
    const enabledProviders = configStore.providers
    
    let filteredProviders = enabledProviders
    if (showFavoritesOnly.value) {
        filteredProviders = enabledProviders.filter(provider => 
            configStore.models.some(model => 
                model.provider_id === provider.id && 
                configStore.isFavoriteModel(provider.id, model.id)
            )
        )
    }
    
    return filteredProviders.map(provider => {
        let models = configStore.models.filter(m => m.provider_id === provider.id)
        
        if (showFavoritesOnly.value) {
            models = models.filter(model => 
                configStore.isFavoriteModel(provider.id, model.id)
            )
        }
        
        if (searchKeyword.value.trim()) {
            models = models.filter(model => 
                model.id.toLowerCase().includes(searchKeyword.value.toLowerCase())
            )
        }
        
        return {
            provider,
            models
        }
    }).filter(group => group.models.length > 0)
})

const openModal = () => {
    modalVisible.value = true
}

const selectModel = (model: any, providerId: string) => {
    emit('update:modelId', model.id)
    emit('update:providerId', providerId)
    modalVisible.value = false
}

const toggleFavorite = (providerId: string, modelId: string) => {
    configStore.toggleFavoriteModel(providerId, modelId)
}

const handleCancel = () => {
    modalVisible.value = false
}

watch(modalVisible, async (newVal) => {
    if (newVal) {
        await nextTick()
        if (modelSelectionRef.value) {
            modelSelectionRef.value.scrollTop = appStatePersistStore.modelChooserScrollPos
        }
    } else {
        if (modelSelectionRef.value) {
            appStatePersistStore.modelChooserScrollPos = modelSelectionRef.value.scrollTop
        }
    }
})
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

.provider-group {
    margin-bottom: 24px;
}

.provider-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 12px;
}

.provider-name {
    font-weight: 500;
    font-size: 14px;
}

.model-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
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
