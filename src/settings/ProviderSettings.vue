<template>
    <div class="sub-settings-container">
        <h2 style="margin-top: 0;">Providers</h2>

        <div class="provider-list-container">
            <a-button type="primary" @click="handleAdd" style="margin-bottom: 16px;">
                <template #icon>
                    <PlusOutlined />
                </template>
                Add Provider
            </a-button>

            <a-table :columns="columns" :data-source="configStore.providers" :pagination="{ pageSize: 10 }" row-key="id">
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'enabled'">
                        <a-tag :color="record.enabled ? 'green' : 'red'">
                            {{ record.enabled ? 'Enabled' : 'Disabled' }}
                        </a-tag>
                    </template>
                    <template v-else-if="column.key === 'action'">
                        <a-space>
                            <a-button type="link" size="small" @click="handleEdit(record)">
                                <template #icon>
                                    <EditOutlined />
                                </template>
                                Edit
                            </a-button>
                            <a-popconfirm title="Are you sure you want to delete this provider?" @confirm="handleDelete(record.id)">
                                <a-button type="link" size="small" danger>
                                    <template #icon>
                                        <DeleteOutlined />
                                    </template>
                                    Delete
                                </a-button>
                            </a-popconfirm>
                        </a-space>
                    </template>
                </template>
            </a-table>
        </div>

        <a-modal v-model:open="modalVisible" :title="isEditing ? 'Edit Provider' : 'Add Provider'" @ok="handleOk" @cancel="handleCancel">
            <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
                <a-form-item label="Name" name="name">
                    <a-input v-model:value="formState.name" placeholder="Provider Name" />
                </a-form-item>
                <a-form-item label="API Key" name="api_key">
                    <a-input-password v-model:value="formState.api_key" placeholder="API Key" />
                </a-form-item>
                <a-form-item label="Base URL" name="baseURL">
                    <a-input v-model:value="formState.baseURL" placeholder="https://api.example.com" />
                </a-form-item>
                <a-form-item label="Request Path" name="requestPath">
                    <a-input v-model:value="formState.requestPath" placeholder="/chat/completions" />
                </a-form-item>
                <a-form-item label="Enabled" name="enabled">
                    <a-switch v-model:checked="formState.enabled" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal v-model:open="selectModalVisible" title="Add Provider" :footer="null" :width="700">
            <div class="provider-selection">
                <div v-for="provider in predefinedProviders" :key="provider.name" class="provider-card" @click="handleSelectProvider(provider)">
                    <div class="provider-icon">{{ provider.icon }}</div>
                    <div class="provider-info">
                        <div class="provider-name">{{ provider.name }}</div>
                        <div class="provider-description">{{ provider.description }}</div>
                    </div>
                    <div class="provider-actions">
                        <a-button 
                            v-if="provider.purchase_url" 
                            type="link" 
                            size="small" 
                            @click.stop="openPurchaseUrl(provider.purchase_url)"
                        >
                            Get API Key
                        </a-button>
                        <a-button type="primary" class="add-now-btn">Add now</a-button>
                    </div>
                </div>
            </div>
        </a-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue'
import { useConfigStore } from '@/stores/configStore'
import { useAppStateStore } from '@/stores/appState'
import type { ProviderConfig } from '@/types/index.ts'

onMounted(() => {
    useAppStateStore().setTitle('Provider Settings')

    fetch('/assets/providers.json')
        .then(response => response.json())
        .then(data => {
            predefinedProviders.value = data
        })
        .catch(error => {
            console.warn('[ProviderSettings]', 'Unable to load providers:', error)
            // at least add a custom entrance
            predefinedProviders.value.push({
                name: 'Custom Provider',
                description: 'Add a custom provider',
                baseURL: '',
                icon: '',
                requestPath: '',
                purchase_url: '',
                isCustom: true
            })
        })
})

const configStore = useConfigStore()
const formRef = ref()
const modalVisible = ref(false)
const selectModalVisible = ref(false)
const isEditing = ref(false)
const editingId = ref('')

const predefinedProviders = ref<Array<{
    name: string
    description: string
    baseURL: string
    icon: string
    requestPath: string
    purchase_url: string
    isCustom: boolean
}>>([])

const formState = reactive<ProviderConfig>({
    id: '',
    name: '',
    baseURL: '',
    api_key: '',
    requestPath: '/chat/completions',
    enabled: true,
})

const rules = {
    name: [{ required: true, message: 'Please input provider name!' }],
    api_key: [{ required: true, message: 'Please input API key!' }],
    baseURL: [
        { required: true, message: 'Please input base URL!' },
        {
            validator: (_rule: any, value: string) => {
                if (!value) {
                    return Promise.resolve()
                }
                try {
                    new URL(value)
                    return Promise.resolve()
                } catch (error) {
                    return Promise.reject(new Error('Please enter a valid URL (e.g., https://api.example.com)'))
                }
            },
            trigger: 'blur'
        }
    ]
}

const columns = [
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name'
    },
    {
        title: 'Base URL',
        dataIndex: 'baseURL',
        key: 'baseURL'
    },
    {
        title: 'Request Path',
        dataIndex: 'requestPath',
        key: 'requestPath'
    },
    {
        title: 'Status',
        key: 'enabled'
    },
    {
        title: 'Action',
        key: 'action',
        width: 150
    }
]

const handleAdd = () => {
    selectModalVisible.value = true
}

const handleSelectProvider = (provider: typeof predefinedProviders.value[0]) => {
    selectModalVisible.value = false
    isEditing.value = false
    modalVisible.value = true
    formState.id = crypto.randomUUID()
    formState.name = provider.isCustom ? "" : provider.name
    formState.api_key = ''
    formState.baseURL = provider.baseURL
    formState.requestPath = provider.requestPath
    formState.enabled = true
}

const handleEdit = (record: ProviderConfig) => {
    isEditing.value = true
    modalVisible.value = true
    formState.id = record.id
    formState.name = record.name
    formState.api_key = record.api_key
    formState.baseURL = record.baseURL
    formState.requestPath = record.requestPath
    formState.enabled = record.enabled
}

const handleDelete = (id: string) => {
    configStore.deleteProvider(id)
    message.success('Provider deleted successfully')
}

const handleOk = async () => {
    try {
        await formRef.value.validate()
        if (isEditing.value) {
            configStore.updateProvider(formState.id, { ...formState })
            message.success('Provider updated successfully')
        } else {
            configStore.addProvider({ ...formState })
            message.success('Provider added successfully')
        }
        modalVisible.value = false
    } catch (error) {
        // console.error('Validation failed:', error)
    }
}

const handleCancel = () => {
    modalVisible.value = false
    formRef.value?.resetFields()
}

const openPurchaseUrl = (url: string) => {
    window.open(url, '_blank')
}
</script>

<style scoped>
.sub-settings-container {
    padding: 24px;
}

.provider-list-container {
    background: #fff;
    padding: 16px;
    border-radius: 4px;
}

.provider-selection {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 60vh;
    overflow-y: auto;
}

.provider-card {
    display: flex;
    align-items: center;
    padding: 16px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
}

.provider-card:hover {
    border-color: #1890ff;
    background-color: #f0f5ff;
}

.provider-icon {
    font-size: 32px;
    margin-right: 16px;
    flex-shrink: 0;
}

.provider-info {
    flex: 1;
    min-width: 0;
}

.provider-name {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 4px;
}

.provider-description {
    font-size: 14px;
    color: #8c8c8c;
    word-break: break-word;
}

.provider-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 16px;
    flex-shrink: 0;
}

.add-now-btn {
    flex-shrink: 0;
}

@media (max-width: 768px) {
    .provider-card {
        flex-direction: column;
        align-items: flex-start;
    }

    .provider-icon {
        margin-right: 0;
        margin-bottom: 8px;
    }

    .provider-info {
        width: 100%;
        margin-bottom: 12px;
    }

    .provider-actions {
        width: 100%;
        margin-left: 0;
        justify-content: flex-end;
    }
}

@media (max-width: 480px) {
    .provider-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .add-now-btn {
        width: 100%;
    }
}
</style>