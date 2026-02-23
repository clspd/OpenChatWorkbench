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

        <div v-for="group in groupedModels" :key="group.provider.id" class="provider-group">
            <div class="provider-header">
                <h3 class="provider-name">{{ group.provider.name }}</h3>
                <a-button 
                    type="link" 
                    size="small"
                    @click="handleToggleAllModels(group)"
                >
                    {{ allModelsEnabled(group) ? t("settings:model.disableAll") : t("settings:model.enableAll") }}
                </a-button>
            </div>
            
            <a-table 
                :columns="columns" 
                :data-source="group.models" 
                row-key="id"
                :pagination="false"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'enabled'">
                        <a-switch 
                            v-model:checked="record.enabled" 
                            @change="handleToggleEnabled(record)"
                        />
                    </template>
                    <template v-else-if="column.key === 'actions'">
                        <a-space>
                            <a-button type="link" size="small" @click="handleEdit(record)">
                                {{ t("settings:model.edit") }}
                            </a-button>
                            <a-button type="link" size="small" danger @click="handleDelete(record.provider_id, record.id)">
                                {{ t("settings:model.delete") }}
                            </a-button>
                        </a-space>
                    </template>
                </template>
            </a-table>
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

        <a-modal 
            v-model:open="conflictModalVisible" 
            title="Model Conflicts Found" 
            :footer="null"
        >
            <a-alert 
                :message="`${conflictModels.length} duplicate models found. How would you like to proceed?`" 
                type="warning" 
                show-icon 
                style="margin-bottom: 1em;"
            />
            
            <a-space direction="vertical" style="width: 100%;">
                <a-button type="primary" block @click="handleOverwriteConflicts">
                    Overwrite All
                </a-button>
                <a-button block @click="handleSkipConflicts">
                    Skip Duplicates
                </a-button>
                <a-button block @click="showConflictDetails">
                    Show Conflict Details
                </a-button>
            </a-space>
        </a-modal>

        <a-modal 
            v-model:open="conflictDetailsVisible" 
            title="Conflict Details" 
            width="800"
            @ok="conflictDetailsVisible = false"
        >
            <a-table 
                :columns="conflictColumns" 
                :data-source="conflictModels" 
                row-key="id"
                :pagination="false"
                size="small"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'existing_provider'">
                        {{ getProviderName(record.existing.provider_id) }}
                    </template>
                    <template v-else-if="column.key === 'new_provider'">
                        {{ selectedProvider?.name }}
                    </template>
                    <template v-else-if="column.key === 'existing_max_tokens'">
                        {{ record.existing.max_tokens }}
                    </template>
                    <template v-else-if="column.key === 'new_max_tokens'">
                        {{ 1024 * 1024 * 1024 }}
                    </template>
                </template>
            </a-table>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, h } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import type { ModelConfig, ProviderConfig } from '@/types/config'
import { message, Modal } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'
import { useAppStateStore } from '@/stores/appState'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { TraceErrorAndGetString } from '@/utils/errorTrace'
import { t } from 'i18next'

const configStore = useConfigStore()

const modalVisible = ref(false)
const isEditing = ref(false)
const formRef = ref<FormInstance>()
const fetchModalVisible = ref(false)
const selectedProviderId = ref('')
const isFetching = ref(false)
const conflictModalVisible = ref(false)
const conflictModels = ref<Array<{ id: string, existing: ModelConfig, new: any }>>([])
const selectedProvider = ref<ProviderConfig | null>(null)
const conflictDetailsVisible = ref(false)
const searchKeyword = ref('')

const formData = reactive<ModelConfig>({
    id: '',
    provider_id: '',
    enabled: true
}), formDataClone = ref<ModelConfig>();

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

const enabledProviders = computed(() => {
    return configStore.providers.filter(p => p.enabled)
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

const handleAdd = () => {
    isEditing.value = false
    Object.assign(formData, {
        id: '',
        provider_id: '',
        max_tokens: 4096,
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

const getProviderName = (providerId: string) => {
    const provider = configStore.getProviderById(providerId)
    return provider ? provider.name : 'Unknown'
}

const handleOverwriteConflicts = () => {
    if (!selectedProvider.value) return

    for (const conflict of conflictModels.value) {
        configStore.updateModel(conflict.existing.provider_id, conflict.id, {
            ...conflict.existing,
            provider_id: selectedProvider.value.id
        })
    }

    message.success(t("settings:model.successfullyUpdatedModels", {
        count: conflictModels.value.length
    }))
    conflictModalVisible.value = false
    fetchModalVisible.value = false
}

const handleSkipConflicts = () => {
    message.info(t("settings:model.skippedDuplicateModels", {
        count: conflictModels.value.length
    }))
    conflictModalVisible.value = false
    fetchModalVisible.value = false
}

const showConflictDetails = () => {
    conflictDetailsVisible.value = true
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
            const newModels: Array<{ id: string, provider_id: string, enabled: boolean }> = []
            const conflicts: Array<{ id: string, existing: ModelConfig, new: any }> = []

            for (const modelData of data.data) {
                const modelId = modelData.id || modelData.model
                if (!modelId) continue

                const existingModel = configStore.models.find(m => m.id === modelId)
                if (existingModel) {
                    conflicts.push({
                        id: modelId,
                        existing: existingModel,
                        new: modelData
                    })
                } else {
                    newModels.push({
                        id: modelId,
                        provider_id: provider.id,
                        enabled: true
                    })
                }
            }

            if (conflicts.length > 0) {
                conflictModels.value = conflicts
                selectedProvider.value = provider
                conflictModalVisible.value = true
                isFetching.value = false
                return
            }

            if (newModels.length > 0) {
                for (const model of newModels) {
                    configStore.addModel(model.provider_id, model.id, model.enabled)
                }
                message.success(t("settings:model.successfullyAddedModels", {
                    count: newModels.length
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
    top: 0;
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
    margin-bottom: 0.5em;
}

.provider-name {
    margin: 0;
    font-size: 1.1em;
    font-weight: 600;
    color: var(--text-color);
}
</style>
