<template>
    <div class="sub-settings-container">
        <h2 style="margin-top: 0;">{{ t('settings:provider.title') }}</h2>

        <a-alert type="info">
            <template #message>{{ t('settings:provider.configGuideAlert') }} <a href="javascript:void(0)" @click="appState.showConfigGuide = true">{{ t('settings:provider.configGuide') }}</a> {{ t('settings:provider.configGuideSuffix') }}</template>
        </a-alert>

        <div class="provider-list-container">
            <a-button type="primary" @click="handleAdd" style="margin-bottom: 16px;">
                <template #icon>
                    <PlusOutlined />
                </template>
                {{ t('settings:provider.addProvider') }}
            </a-button>

            <a-table :columns="columns" :data-source="configStore.providers" :pagination="{ pageSize: 10 }" row-key="id">
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'enabled'">
                        <a-tag :color="record.enabled ? 'green' : 'red'">
                            {{ record.enabled ? t('settings:provider.enabled') : t('settings:provider.disabled') }}
                        </a-tag>
                    </template>
                    <template v-else-if="column.key === 'action'">
                        <a-space>
                            <a-button type="link" size="small" @click="handleEdit(record)">
                                <template #icon>
                                    <EditOutlined />
                                </template>
                                {{ t('settings:provider.edit') }}
                            </a-button>
                            <a-popconfirm :title="t('settings:provider.deleteConfirm')" @confirm="handleDelete(record.id)">
                                <a-button type="link" size="small" danger>
                                    <template #icon>
                                        <DeleteOutlined />
                                    </template>
                                    {{ t('settings:provider.delete') }}
                                </a-button>
                            </a-popconfirm>
                        </a-space>
                    </template>
                </template>
            </a-table>
        </div>

        <a-modal v-model:open="modalVisible" :title="isEditing ? t('settings:provider.editProviderModal') : t('settings:provider.addProviderModal')" @ok="handleOk" @cancel="handleCancel">
            <a-form ref="formRef" :model="formState" :rules="rules" layout="vertical">
                <a-form-item :label="t('settings:provider.name')" name="name">
                    <a-input v-model:value="formState.name" :placeholder="t('settings:provider.namePlaceholder')" />
                </a-form-item>
                <a-form-item :label="t('settings:provider.apiKey')" name="api_key">
                    <a-input-password v-model:value="formState.api_key" :placeholder="t('settings:provider.apiKeyPlaceholder')" />
                </a-form-item>
                <a-form-item :label="t('settings:provider.baseURL')" name="baseURL">
                    <a-input v-model:value="formState.baseURL" :placeholder="t('settings:provider.baseURLPlaceholder')" />
                </a-form-item>
                <a-form-item :label="t('settings:provider.requestPath')" name="requestPath">
                    <a-input v-model:value="formState.requestPath" :placeholder="t('settings:provider.requestPathPlaceholder')" />
                </a-form-item>
                <a-form-item :label="t('settings:provider.compatibilityMode')" name="compatibilityMode">
                    <a-radio-group v-model:value="formState.compatibilityMode" style="display: flex; gap: 0.5em; flex-wrap: wrap; overflow-wrap: anywhere;">
                        <a-radio value="untested" disabled v-if="formState.compatibilityMode === 'untested'">{{ t('settings:provider.compatibilityModeUntested') }}</a-radio>
                        <template v-else>
                            <a-radio value="openai">{{ t('settings:provider.compatibilityModeOpenAI') }}</a-radio>
                            <a-radio value="claude">{{ t('settings:provider.compatibilityModeClaude') }}</a-radio>
                            <a-radio value="gemini">{{ t('settings:provider.compatibilityModeGemini') }}</a-radio>
                        </template>
                    </a-radio-group>
                </a-form-item>
                <a-form-item :label="t('settings:provider.enabled')" name="enabled">
                    <a-switch v-model:checked="formState.enabled" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal v-model:open="selectModalVisible" :title="t('settings:provider.addProviderModal')" :footer="null" :width="700">
            <div class="provider-selection">
                <div v-for="provider in predefinedProviders" :key="provider.name" class="provider-card" @click="handleSelectProvider(provider)">
                    <div class="provider-icon">{{ provider.icon }}</div>
                    <div class="provider-info">
                        <div class="provider-name">{{ provider.isCustom ? t('settings:provider.customProvider') : provider.name }}</div>
                        <div class="provider-description">{{ provider.isCustom ? t('settings:provider.customProviderDescription') : provider.description }}</div>
                    </div>
                    <div class="provider-actions">
                        <a-button 
                            v-if="provider.purchase_url" 
                            type="link" 
                            size="small" 
                            @click.stop="openPurchaseUrl(provider.purchase_url)"
                        >
                            {{ t('settings:provider.getAPIKey') }}
                        </a-button>
                        <a-button type="primary" class="add-now-btn">{{ t('settings:provider.addNow') }}</a-button>
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
import type { ProviderConfig } from '@/types/config'
import { t } from 'i18next'

const appState = useAppStateStore()

onMounted(() => {
    appState.setTitle('Provider Settings')

    fetch('/assets/providers.json')
        .then(response => response.json())
        .then(data => {
            predefinedProviders.value = data
        })
        .catch(error => {
            console.warn('[ProviderSettings]', t('settings:provider.unableToLoadProviders'), error)
            // at least add a custom entrance
            predefinedProviders.value.push({
                name: t('settings:provider.customProvider'),
                description: t('settings:provider.customProviderDescription'),
                baseURL: '',
                icon: '',
                requestPath: '',
                purchase_url: '',
                compatibilityMode: 'openai',
                isCustom: true
            })
        })
})

const configStore = useConfigStore()
const formRef = ref()
const modalVisible = ref(false)
const selectModalVisible = ref(false)
const isEditing = ref(false)

const predefinedProviders = ref<Array<{
    name: string
    description: string
    baseURL: string
    icon: string
    requestPath: string
    purchase_url: string
    compatibilityMode: 'openai' | 'claude' | 'gemini' | 'untested'
    isCustom: boolean
}>>([])

const formState = reactive<ProviderConfig>({
    id: '',
    name: '',
    baseURL: '',
    api_key: '',
    requestPath: '/chat/completions',
    compatibilityMode: 'openai',
    enabled: true,
})

const rules = {
    name: [{ required: true, message: t('settings:provider.nameRequired') }],
    api_key: [{ required: true, message: t('settings:provider.apiKeyRequired') }],
    baseURL: [
        { required: true, message: t('settings:provider.baseURLRequired') },
        {
            validator: (_rule: any, value: string) => {
                if (!value) {
                    return Promise.resolve()
                }
                try {
                    new URL(value)
                    return Promise.resolve()
                } catch (error) {
                    return Promise.reject(new Error(t('settings:provider.invalidURL')))
                }
            },
            trigger: 'blur'
        }
    ]
}

const columns = [
    {
        title: t('settings:provider.name'),
        dataIndex: 'name',
        key: 'name'
    },
    {
        title: t('settings:provider.baseURL'),
        dataIndex: 'baseURL',
        key: 'baseURL'
    },
    {
        title: t('settings:provider.requestPath'),
        dataIndex: 'requestPath',
        key: 'requestPath'
    },
    {
        title: t('settings:provider.compatibilityMode'),
        dataIndex: 'compatibilityMode',
        key: 'compatibilityMode'
    },
    {
        title: t('settings:provider.status'),
        key: 'enabled'
    },
    {
        title: t('settings:provider.actions'),
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
    formState.compatibilityMode = provider.compatibilityMode
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
    formState.compatibilityMode = record.compatibilityMode
    formState.enabled = record.enabled
}

const handleDelete = (id: string) => {
    configStore.deleteProvider(id)
    message.success(t('settings:provider.providerDeletedSuccessfully'))
}

const handleOk = async () => {
    try {
        await formRef.value.validate()
        if (isEditing.value) {
            configStore.updateProvider(formState.id, { ...formState })
            message.success(t('settings:provider.providerUpdatedSuccessfully'))
        } else {
            configStore.addProvider({ ...formState })
            message.success(t('settings:provider.providerAddedSuccessfully'))
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
    padding: 1em;
}

.provider-list-container {
    background: #fff;
    margin-top: 1em;
    border-radius: 4px;
    overflow: auto;
}

.provider-selection {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 60vh;
    overflow: auto;
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