<template>
    <div class="sub-settings-container">
        <h2>{{ t("settings:model.title") }}</h2>

        <div class="filter-bar">
            <a-input 
                v-model:value="searchKeyword" 
                :placeholder="t('settings:model.placeholder')" 
                allow-clear
            >
                <template #prefix>
                    <SearchOutlined />
                </template>
            </a-input>
        </div>

        <div class="action-buttons">
            <a-button type="primary" @click="openFetchModal">{{ t("settings:model.fetch") }}</a-button>
            <a-button @click="handleAdd">{{ t("settings:model.add") }}</a-button>
            <a-button @click="handleCleanup">{{ t("settings:model.cleanup") }}</a-button>
        </div>

        <div class="provider-group" v-if="configStore.hasZombieModels()">
            <div class="provider-header">
                <h3 class="provider-name">{{ t("settings:model.zombie.title") }}</h3>
            </div>
            <p>{{ t("settings:model.zombie.description") }}</p>
            <a-button @click="handleCleanup">{{ t("settings:model.zombie.cleanupNow") }}</a-button>
        </div>

        <div class="virtual-list-container" ref="virtualListRef">
            <div class="virtual-list-content">
                <div :style="{ height: `${totalSize}px` }"></div>
                <div v-for="vi in virtualItems" :key="vi.index"
                    class="virtual-item"
                    :data-index="vi.index"
                    :style="{ top: `${vi.start}px` }"
                    :ref="el => el && measureElement(el as HTMLElement)"
                >
                    <template v-if="flattenedData[vi.index]!.type === 'header'">
                        <div class="provider-header">
                            <h3 class="provider-name">{{ flattenedData[vi.index]!.provider?.name }}</h3>
                            <a-button 
                                type="link" 
                                size="small"
                                @click="handleToggleAllModels(flattenedData[vi.index]!.group!)"
                            >
                                {{ allModelsEnabled(flattenedData[vi.index]!.group!) ? t("settings:model.disableAll") : t("settings:model.enableAll") }}
                            </a-button>
                        </div>
                    </template>
                    <template v-else>
                        <div class="model-row">
                            <div class="model-cell model-id">{{ flattenedData[vi.index]!.model!.id }}</div>
                            <div class="model-cell model-enabled">
                                <a-switch 
                                    v-model:checked="flattenedData[vi.index]!.model!.enabled" 
                                    @change="handleToggleEnabled(flattenedData[vi.index]!.model!)"
                                />
                            </div>
                            <div class="model-cell model-actions">
                                <a-space>
                                    <a-button type="link" size="small" @click="handleEdit(flattenedData[vi.index]!.model!)">
                                        {{ t("settings:model.edit") }}
                                    </a-button>
                                    <a-button type="link" size="small" danger @click="handleDelete(flattenedData[vi.index]!.model!.provider_id!, flattenedData[vi.index]!.model!.id!)">
                                        {{ t("settings:model.delete") }}
                                    </a-button>
                                </a-space>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <a-modal 
            v-model:open="modalVisible" 
            :title="isEditing ? 'Edit Model' : 'Add Model'" 
            @ok="handleOk"
            @cancel="handleCancel"
        >
            <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
                <a-form-item label="Provider" name="provider_id">
                    <a-select v-model:value="formData.provider_id" placeholder="Select provider">
                        <a-select-option 
                            v-for="provider in enabledProviders" 
                            :key="provider.id" 
                            :value="provider.id"
                        >
                            {{ provider.name }}
                        </a-select-option>
                    </a-select>
                </a-form-item>

                <a-form-item label="Model ID" name="id">
                    <a-input v-model:value="formData.id" placeholder="e.g., gpt-4, deepseek-chat" />
                </a-form-item>

                <a-form-item label="Enabled" name="enabled">
                    <a-switch v-model:checked="formData.enabled" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal 
            v-model:open="fetchModalVisible" 
            title="Fetch Models from Provider" 
            @ok="handleFetchOk"
            @cancel="fetchModalVisible = false"
            :confirm-loading="isFetching"
        >
            <a-form layout="vertical">
                <a-form-item label="Select Provider">
                    <a-select v-model:value="selectedProviderId" placeholder="Select a provider">
                        <a-select-option 
                            v-for="provider in enabledProviders" 
                            :key="provider.id" 
                            :value="provider.id"
                        >
                            {{ provider.name }} ({{ provider.baseURL }})
                        </a-select-option>
                    </a-select>
                </a-form-item>
            </a-form>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { t } from 'i18next'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { useAppStateStore } from '@/stores/appState'
import { useConfigStore } from '@/stores/configStore'
import { useWindowStateStore } from '@/stores/windowState'
import type { ModelConfig, ProviderConfig } from '@/types/config'
import { TraceErrorAndGetString } from '@/utils/errorTrace'
import { useVirtualizer } from '@tanstack/vue-virtual'

const configStore = useConfigStore()
const windowState = useWindowStateStore()

const modalVisible = ref(false)
const isEditing = ref(false)
const formRef = ref<FormInstance>()
const fetchModalVisible = ref(false)
const selectedProviderId = ref('')
const isFetching = ref(false)
const searchKeyword = ref('')

const formData = reactive<ModelConfig>({
    id: '',
    provider_id: '',
    enabled: true
}), formDataClone = ref<ModelConfig>();

const virtualListRef = ref<HTMLDivElement>()

const enabledProviders = computed(() => {
    return configStore.providers.filter(p => !!p.enabled)
})

const groupedModels = computed(() => {
    const groups = enabledProviders.value.map(provider => ({
        provider,
        models: configStore.models
            .filter(m => m.provider_id === provider.id)
            .filter(m => !searchKeyword.value || m.id.toLowerCase().includes(searchKeyword.value.toLowerCase()))
    }))
    return groups.filter(group => group.models.length > 0)
})

const flattenedData = computed(() => {
    const result: Array<{
        type: 'header' | 'model',
        provider?: ProviderConfig,
        group?: { provider: ProviderConfig, models: ModelConfig[] },
        model?: ModelConfig
    }> = []
    
    for (const group of groupedModels.value) {
        result.push({
            type: 'header',
            provider: group.provider,
            group: group
        })
        
        for (const model of group.models) {
            result.push({
                type: 'model',
                model: model
            })
        }
    }
    
    return result
})

const vOptions = computed(() => ({
    count: flattenedData.value.length,
    getScrollElement: () => virtualListRef.value || null,
    estimateSize: (index: number) => {
        return flattenedData.value[index]?.type === 'header' ? 60 : 50
    },
    overscan: 5,
}))

const virtualizer = useVirtualizer(vOptions)
const virtualItems = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

const measureElement = (el: HTMLElement) => {
    virtualizer.value.measureElement(el)
}

const columns = [
    {
        title: t("settings:model.modelID"),
        dataIndex: 'id',
        key: 'id'
    },
    {
        title: t("settings:model.enabled"),
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100
    },
    {
        title: t("settings:model.actions"),
        key: 'actions',
        width: 150
    }
]

const conflictColumns = [
    {
        title: t("settings:model.modelID"),
        dataIndex: 'id',
        key: 'id',
        width: 200
    },
    {
        title: t("settings:model.existingProvider"),
        key: 'existing_provider',
        width: 150
    },
    {
        title: t("settings:model.newProvider"),
        key: 'new_provider',
        width: 150
    },
]

const rules = {
    provider_id: [{ required: true, message: t("settings:model.selectProvider") }],
    id: [{ required: true, message: t("settings:model.inputModelID") }]
}

onMounted(() => {
    useAppStateStore().setTitle('Model Settings')
})

const handleAdd = () => {
    isEditing.value = false
    Object.assign(formData, {
        id: '',
        provider_id: '',
        enabled: true
    })
    modalVisible.value = true
}

const handleEdit = (model: ModelConfig) => {
    isEditing.value = true;
    Object.assign(formData, { ...model });
    formDataClone.value = model;
    modalVisible.value = true;
}

const handleDelete = (provider_id: string, id: string) => {
    configStore.deleteModel(provider_id, id);
    message.success(t("settings:model.modelDeletedSuccessfully"));
}

const handleToggleEnabled = (model: ModelConfig) => {
    configStore.updateModel(model.provider_id, model.id, model);
}

const allModelsEnabled = (group: { provider: ProviderConfig, models: ModelConfig[] }) => {
    return group.models.every(m => m.enabled);
}

const handleToggleAllModels = (group: { provider: ProviderConfig, models: ModelConfig[] }) => {
    const hasFilter = searchKeyword.value.trim() !== '';
    const targetModels = hasFilter
        ? group.models
        : configStore.models.filter(m => m.provider_id === group.provider.id);
    
    const newState = !allModelsEnabled(group);
    
    for (const model of targetModels) {
        configStore.updateModel(model.provider_id, model.id, {
            enabled: newState
        });
    }
    
    const scope = hasFilter ? 'filtered' : 'all'
    message.success(t("settings:model.modelsToggledSuccessfully", {
        newState: newState ? t("settings:model.enabled") : t("settings:model.disabled"),
        scope: scope,
        providerName: group.provider.name
    }))
}

const handleOk = async () => {
    try {
        await formRef.value?.validate()
        
        if (isEditing.value) {
            if (!formData.id) {
                message.error(t("settings:model.inputModelID"))
                return
            }
            if (!formDataClone.value) {
                message.error(t("settings:model.modelEditorDamaged"))
                return
            }
            configStore.updateModel(formDataClone.value.provider_id, formDataClone.value.id, formData);
            message.success(t("settings:model.modelUpdatedSuccessfully"))
        } else {
            configStore.addModel(formData.provider_id, formData.id, formData.enabled);
            message.success(t("settings:model.modelAddedSuccessfully"))
        }
        
        modalVisible.value = false
    } catch (error) {
        message.error(t("settings:model.operationFailed") + error)
    }
}

const handleCancel = () => {
    modalVisible.value = false
}

const openFetchModal = () => {
    selectedProviderId.value = ''
    fetchModalVisible.value = true
}

const handleFetchOk = async () => {
    if (!selectedProviderId.value) {
        message.warning(t("settings:model.pleaseSelectProvider"))
        return
    }

    const provider = configStore.getProviderById(selectedProviderId.value)
    if (!provider) {
        message.error(t("settings:model.providerNotFound"))
        return
    }

    isFetching.value = true

    try {
        const url = (`${provider.baseURL}/models`).replace(/\/\/models/, '/models')
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${provider.api_key}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.data && Array.isArray(data.data)) {
            let addedCount = 0
            let updatedCount = 0

            for (const modelData of data.data) {
                const modelId = modelData.id || modelData.model
                if (!modelId) continue

                const existingModel = configStore.models.find(m => m.id === modelId)
                if (existingModel) {
                    configStore.updateModel(existingModel.provider_id, modelId, {
                        ...existingModel,
                        provider_id: provider.id
                    })
                    updatedCount++
                } else {
                    configStore.addModel(provider.id, modelId, true)
                    addedCount++
                }
            }

            const totalModels = addedCount + updatedCount
            if (totalModels > 0) {
                message.success(t("settings:model.successfullyAddedModels", {
                    count: totalModels
                }))
                fetchModalVisible.value = false
            } else {
                message.warning(t("settings:model.noModelsFoundInResponse"))
            }
        } else {
            message.warning(t("settings:model.invalidResponseFormatFromAPI"))
        }
    } catch (error) {
        console.error('Failed to fetch models:', error)
        message.error(t("settings:model.operationFailed") + TraceErrorAndGetString(error))
    } finally {
        isFetching.value = false
    }
}

const handleCleanup = async () => {
    if (!await new Promise(r => Modal.confirm({
        title: t("settings:model.cleanup"),
        icon: h(InfoCircleOutlined),
        content: t("settings:model.cleanupZombieModelsWarning"),
        okText: t("settings:model.cleanup"),
        okType: "primary",
        cancelText: t("common:ui.dialog.cancel"),
        onOk: () => r(true),
        onCancel: () => r(false),
    }))) return;

    const cleanedCount = configStore.cleanupZombieModels()
    message.success(t("settings:model.successfullyRemovedZombieModels", {
        count: cleanedCount
    }));
}
</script>

<style scoped>
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

.filter-bar {
    position: sticky;
    top: 3em;
    z-index: 10;
    background: var(--bg-color);
    padding: 0.5em 0;
}

.action-buttons {
    display: flex;
    gap: 0.5em;
}

.provider-group {
    margin-top: 1.5em;
}

.provider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5em;
    padding: 0.5em 0;
}

.provider-name {
    margin: 0;
    font-size: 1.1em;
    font-weight: 600;
    color: var(--text-color);
}

.virtual-list-container {
    flex: 1;
    overflow-y: auto;
    min-height: 300px;
}

.virtual-list-content {
    position: relative;
}

.virtual-item {
    position: absolute;
    left: 0;
    right: 0;
}

.model-row {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    align-items: center;
}

.model-cell {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
}

.model-id {
    flex: 1;
}

.model-enabled {
    width: 100px;
}

.model-actions {
    width: 150px;
}
</style>
