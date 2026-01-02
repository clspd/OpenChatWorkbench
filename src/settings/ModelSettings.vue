<template>
    <div class="sub-settings-container">
        <h2>Models</h2>

        <div class="filter-bar">
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

        <div class="action-buttons">
            <a-button type="primary" @click="handleAdd">Add Model</a-button>
            <a-button @click="openFetchModal">Fetch Models</a-button>
        </div>

        <div v-for="group in groupedModels" :key="group.provider.id" class="provider-group">
            <div class="provider-header">
                <h3 class="provider-name">{{ group.provider.name }}</h3>
                <a-button 
                    type="link" 
                    size="small"
                    @click="handleToggleAllModels(group)"
                >
                    {{ allModelsEnabled(group) ? 'Disable All' : 'Enable All' }}
                </a-button>
            </div>
            
            <a-table 
                :columns="columns" 
                :data-source="group.models" 
                row-key="id"
                :pagination="false"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'max_tokens'">
                        {{ record.max_tokens }}
                    </template>
                    <template v-else-if="column.key === 'enabled'">
                        <a-switch 
                            v-model:checked="record.enabled" 
                            @change="handleToggleEnabled(record)"
                        />
                    </template>
                    <template v-else-if="column.key === 'actions'">
                        <a-space>
                            <a-button type="link" size="small" @click="handleEdit(record)">
                                Edit
                            </a-button>
                            <a-button type="link" size="small" danger @click="handleDelete(record.id)">
                                Delete
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

                <a-form-item label="Max Tokens" name="max_tokens">
                    <a-input-number 
                        v-model:value="formData.max_tokens" 
                        :min="1" 
                        :max="1 * 1024 * 1024 * 1024" 
                        style="width: 100%" 
                    />
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
import { ref, computed, reactive } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import type { ModelConfig, ProviderConfig } from '@/types/index.ts'
import { message } from 'ant-design-vue'
import type { FormInstance } from 'ant-design-vue'

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

const formData = reactive<Partial<ModelConfig>>({
    id: '',
    provider_id: '',
    max_tokens: 4096,
    enabled: true
})

const columns = [
    {
        title: 'Model ID',
        dataIndex: 'id',
        key: 'id'
    },
    {
        title: 'Max Tokens',
        dataIndex: 'max_tokens',
        key: 'max_tokens'
    },
    {
        title: 'Enabled',
        dataIndex: 'enabled',
        key: 'enabled',
        width: 100
    },
    {
        title: 'Actions',
        key: 'actions',
        width: 150
    }
]

const conflictColumns = [
    {
        title: 'Model ID',
        dataIndex: 'id',
        key: 'id',
        width: 200
    },
    {
        title: 'Existing Provider',
        key: 'existing_provider',
        width: 150
    },
    {
        title: 'New Provider',
        key: 'new_provider',
        width: 150
    },
    {
        title: 'Existing Max Tokens',
        key: 'existing_max_tokens',
        width: 120
    },
    {
        title: 'New Max Tokens',
        key: 'new_max_tokens',
        width: 120
    }
]

const rules = {
    provider_id: [{ required: true, message: 'Please select a provider!' }],
    id: [{ required: true, message: 'Please input model ID!' }],
    max_tokens: [{ required: true, message: 'Please input max tokens!' }]
}

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
    isEditing.value = true
    Object.assign(formData, { ...model })
    modalVisible.value = true
}

const handleDelete = (id: string) => {
    configStore.deleteModel(id)
    message.success('Model deleted successfully')
}

const handleToggleEnabled = (model: ModelConfig) => {
    configStore.updateModel(model.id, model)
}

const allModelsEnabled = (group: { provider: ProviderConfig, models: ModelConfig[] }) => {
    return group.models.every(m => m.enabled)
}

const handleToggleAllModels = (group: { provider: ProviderConfig, models: ModelConfig[] }) => {
    const hasFilter = searchKeyword.value.trim() !== ''
    const targetModels = hasFilter 
        ? group.models 
        : configStore.models.filter(m => m.provider_id === group.provider.id)
    
    const newState = !allModelsEnabled(group)
    
    for (const model of targetModels) {
        configStore.updateModel(model.id, {
            ...model,
            enabled: newState
        })
    }
    
    const scope = hasFilter ? 'filtered' : 'all'
    message.success(`${newState ? 'Enabled' : 'Disabled'} ${scope} models for ${group.provider.name}`)
}

const handleOk = async () => {
    try {
        await formRef.value?.validate()
        
        if (isEditing.value) {
            configStore.updateModel(formData.id!, formData as ModelConfig)
            message.success('Model updated successfully')
        } else {
            configStore.addModel(formData as ModelConfig)
            message.success('Model added successfully')
        }
        
        modalVisible.value = false
    } catch (error) {
        console.error('Validation failed:', error)
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
        configStore.updateModel(conflict.id, {
            ...conflict.existing,
            provider_id: selectedProvider.value.id,
            max_tokens: 1024 * 1024 * 1024
        })
    }

    message.success(`Successfully updated ${conflictModels.value.length} models`)
    conflictModalVisible.value = false
    fetchModalVisible.value = false
}

const handleSkipConflicts = () => {
    message.info(`Skipped ${conflictModels.value.length} duplicate models`)
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
        message.warning('Please select a provider')
        return
    }

    const provider = configStore.getProviderById(selectedProviderId.value)
    if (!provider) {
        message.error('Provider not found')
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
            const newModels: Array<{ id: string, provider_id: string, max_tokens: number, enabled: boolean }> = []
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
                        max_tokens: 1024 * 1024 * 1024,
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
                    configStore.addModel(model)
                }
                message.success(`Successfully added ${newModels.length} models`)
                fetchModalVisible.value = false
            } else {
                message.warning('No models found in response')
            }
        } else {
            message.warning('Invalid response format from API')
        }
    } catch (error) {
        console.error('Failed to fetch models:', error)
        message.error(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
        isFetching.value = false
    }
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
