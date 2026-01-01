<template>
    <div class="file-browser-view">
        <h2 style="margin-top: 0;">File Browser</h2>

        <div class="file-browser-toolbar">
            <a-space>
                <a-button type="primary" @click="handleCreateFolder">
                    <template #icon>
                        <FolderAddOutlined />
                    </template>
                    New Folder
                </a-button>
                <a-button @click="handleCreateFile">
                    <template #icon>
                        <FileAddOutlined />
                    </template>
                    New File
                </a-button>
                <a-button @click="handleUpload" :disabled="!selectedItem">
                    <template #icon>
                        <UploadOutlined />
                    </template>
                    Upload
                </a-button>
                <a-button @click="handleDelete" danger :disabled="!selectedItem">
                    <template #icon>
                        <DeleteOutlined />
                    </template>
                    Delete
                </a-button>
                <a-button @click="handleRename" :disabled="!selectedItem">
                    <template #icon>
                        <EditOutlined />
                    </template>
                    Rename
                </a-button>
            </a-space>
        </div>

        <div class="file-browser-path">
            <a-breadcrumb>
                <a-breadcrumb-item @click="navigateToPath('')">
                    <HomeOutlined /> Root
                </a-breadcrumb-item>
                <a-breadcrumb-item 
                    v-for="(segment, index) in pathSegments" 
                    :key="index"
                    @click="navigateToPath(getPathUpTo(index))"
                >
                    {{ segment }}
                </a-breadcrumb-item>
            </a-breadcrumb>
        </div>

        <div class="file-browser-content">
            <a-table 
                :columns="columns" 
                :data-source="fileList" 
                :pagination="false"
                row-key="name"
                :custom-row="customRow"
                @row-click="handleRowClick"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'name'">
                        <span class="file-name">
                            <span class="file-icon">{{ record.isDirectory ? '📁' : '📄' }}</span>
                            {{ record.name }}
                        </span>
                    </template>
                    <template v-else-if="column.key === 'size'">
                        {{ record.isDirectory ? '-' : formatSize(record.size) }}
                    </template>
                    <template v-else-if="column.key === 'modified'">
                        {{ formatDate(record.modified) }}
                    </template>
                </template>
            </a-table>
        </div>

        <a-modal v-model:open="createFolderVisible" title="Create New Folder" @ok="handleCreateFolderOk">
            <a-form layout="vertical">
                <a-form-item label="Folder Name">
                    <a-input v-model:value="newFolderName" placeholder="Enter folder name" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal v-model:open="createFileVisible" title="Create New File" @ok="handleCreateFileOk">
            <a-form layout="vertical">
                <a-form-item label="File Name">
                    <a-input v-model:value="newFileName" placeholder="Enter file name (e.g., document.txt)" />
                </a-form-item>
            </a-form>
        </a-modal>

        <a-modal v-model:open="renameVisible" title="Rename" @ok="handleRenameOk">
            <a-form layout="vertical">
                <a-form-item label="New Name">
                    <a-input v-model:value="newName" placeholder="Enter new name" />
                </a-form-item>
            </a-form>
        </a-modal>

        <input 
            ref="fileInputRef" 
            type="file" 
            style="display: none" 
            @change="handleFileInputChange"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fs } from '@/userdata'
import { useAppStateStore } from '@/stores/appState'
import { message } from 'ant-design-vue'
import { 
    FolderAddOutlined, 
    FileAddOutlined, 
    DeleteOutlined, 
    EditOutlined,
    HomeOutlined,
    UploadOutlined
} from '@ant-design/icons-vue'

onMounted(() => {
    useAppStateStore().setTitle('File Browser (Debug)')
    loadFiles()
})

const currentPath = ref('')
const selectedItem = ref<any>(null)
const fileList = ref<Array<{
    name: string
    isDirectory: boolean
    size: number
    modified: Date
}>>([])

const createFolderVisible = ref(false)
const createFileVisible = ref(false)
const renameVisible = ref(false)
const newFolderName = ref('')
const newFileName = ref('')
const newName = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const pathSegments = computed(() => {
    if (!currentPath.value) return []
    return currentPath.value.split('/').filter(Boolean)
})

const columns = [
    {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        width: '40%'
    },
    {
        title: 'Size',
        dataIndex: 'size',
        key: 'size',
        width: '20%'
    },
    {
        title: 'Modified',
        dataIndex: 'modified',
        key: 'modified',
        width: '40%'
    }
]

const customRow = (record: any) => {
    return {
        class: {
            'selected-row': selectedItem.value?.name === record.name
        },
        onDblclick: () => {
            if (record.isDirectory) {
                navigateToPath(currentPath.value ? `${currentPath.value}/${record.name}` : record.name)
            }
        }
    }
}

const loadFiles = async () => {
    try {
        const path = currentPath.value || '/'
        const entries = await fs.readdir(path)
        
        const files = await Promise.all(
            entries.map(async (name: string) => {
                const fullPath = path === '/' ? `/${name}` : `${path}/${name}`
                const stats = await fs.stat(fullPath)
                return {
                    name,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    modified: stats.mtime
                }
            })
        )
        
        fileList.value = files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1
            if (!a.isDirectory && b.isDirectory) return 1
            return a.name.localeCompare(b.name)
        })
    } catch (error) {
        console.error('Error loading files:', error)
        message.error('Failed to load files')
    }
}

const navigateToPath = (path: string) => {
    currentPath.value = path
    selectedItem.value = null
    loadFiles()
}

const getPathUpTo = (index: number) => {
    return pathSegments.value.slice(0, index + 1).join('/')
}

const handleRowClick = (record: any) => {
    selectedItem.value = record
}

const handleCreateFolder = () => {
    newFolderName.value = ''
    createFolderVisible.value = true
}

const handleCreateFolderOk = async () => {
    if (!newFolderName.value.trim()) {
        message.warning('Please enter a folder name')
        return
    }

    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${newFolderName.value}` : `${path}/${newFolderName.value}`
        await fs.mkdir(fullPath)
        message.success('Folder created successfully')
        createFolderVisible.value = false
        loadFiles()
    } catch (error) {
        console.error('Error creating folder:', error)
        message.error('Failed to create folder')
    }
}

const handleCreateFile = () => {
    newFileName.value = ''
    createFileVisible.value = true
}

const handleCreateFileOk = async () => {
    if (!newFileName.value.trim()) {
        message.warning('Please enter a file name')
        return
    }

    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${newFileName.value}` : `${path}/${newFileName.value}`
        await fs.writeFile(fullPath, '')
        message.success('File created successfully')
        createFileVisible.value = false
        loadFiles()
    } catch (error) {
        console.error('Error creating file:', error)
        message.error('Failed to create file')
    }
}

const handleDelete = async () => {
    if (!selectedItem.value) return

    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${selectedItem.value.name}` : `${path}/${selectedItem.value.name}`
        
        if (selectedItem.value.isDirectory) {
            await fs.rm(fullPath, { recursive: true, force: true })
        } else {
            await fs.unlink(fullPath)
        }
        
        message.success('Deleted successfully')
        selectedItem.value = null
        loadFiles()
    } catch (error) {
        console.error('Error deleting:', error)
        message.error('Failed to delete')
    }
}

const handleRename = () => {
    if (!selectedItem.value) return
    newName.value = selectedItem.value.name
    renameVisible.value = true
}

const handleRenameOk = async () => {
    if (!newName.value.trim()) {
        message.warning('Please enter a new name')
        return
    }

    try {
        const path = currentPath.value || '/'
        const oldPath = path === '/' ? `/${selectedItem.value.name}` : `${path}/${selectedItem.value.name}`
        const newPath = path === '/' ? `/${newName.value}` : `${path}/${newName.value}`
        
        await fs.rename(oldPath, newPath)
        message.success('Renamed successfully')
        renameVisible.value = false
        selectedItem.value = null
        loadFiles()
    } catch (error) {
        console.error('Error renaming:', error)
        message.error('Failed to rename')
    }
}

const handleUpload = () => {
    if (!selectedItem.value || !selectedItem.value.isDirectory) {
        message.warning('Please select a folder to upload to')
        return
    }
    fileInputRef.value?.click()
}

const handleFileInputChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (!file) return

    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${selectedItem.value.name}/${file.name}` : `${path}/${selectedItem.value.name}/${file.name}`
        
        const content = await file.arrayBuffer()
        await fs.writeFile(fullPath, new Uint8Array(content))
        
        message.success('File uploaded successfully')
        loadFiles()
    } catch (error) {
        console.error('Error uploading file:', error)
        message.error('Failed to upload file')
    }
    
    if (target) {
        target.value = ''
    }
}

const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString()
}
</script>

<style scoped>
.file-browser-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1em;
    gap: 16px;
}

.file-browser-toolbar {
    display: flex;
    align-items: center;
}

.file-browser-path {
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
}

.file-browser-path :deep(.ant-breadcrumb-link) {
    cursor: pointer;
}

.file-browser-content {
    flex: 1;
    overflow: auto;
    background: #fff;
    border-radius: 4px;
}

.file-name {
    display: flex;
    align-items: center;
    gap: 8px;
}

.file-icon {
    font-size: 18px;
}

.selected-row {
    background-color: #e6f7ff !important;
}

:deep(.ant-table-tbody > tr:hover > td) {
    cursor: pointer;
}
</style>
