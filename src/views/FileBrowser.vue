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
                <a-button @click="handleUpload">
                    <template #icon>
                        <UploadOutlined />
                    </template>
                    Upload
                </a-button>
                <a-button @click="handleDelete" danger :disabled="selectedRowKeys.length === 0">
                    <template #icon>
                        <DeleteOutlined />
                    </template>
                    Delete
                </a-button>
                <a-button @click="handleRename" :disabled="selectedRowKeys.length === 0">
                    <template #icon>
                        <EditOutlined />
                    </template>
                    Rename
                </a-button>
                <a-button @click="handleDownload" :disabled="selectedRowKeys.length === 0">
                    <template #icon>
                        <DownloadOutlined />
                    </template>
                    Download
                </a-button>
            </a-space>
        </div>

        <div class="file-browser-path">
            <a-breadcrumb>
                <a-breadcrumb-item 
                    tabindex="0"
                    @click="navigateToPath('')"
                    @keydown.enter="navigateToPath('')"
                    @keydown.space.prevent="navigateToPath('')"
                >
                    <HomeOutlined /> Root
                </a-breadcrumb-item>
                <a-breadcrumb-item 
                    v-for="(segment, index) in pathSegments" 
                    :key="index"
                    tabindex="0"
                    @click="navigateToPath(getPathUpTo(index))"
                    @keydown.enter="navigateToPath(getPathUpTo(index))"
                    @keydown.space.prevent="navigateToPath(getPathUpTo(index))"
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
                :row-selection="{ 
                    selectedRowKeys: selectedRowKeys, 
                    onChange: onSelectChange,
                }"
            >
                <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'name'">
                        <span class="file-name" tabindex="0" @click="handleRowClick(record)" @keydown.enter="handleRowClick(record)">
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

        <a-modal 
            v-model:open="viewFileVisible" 
            :title="`Editing: ${currentEditingFile}`" 
            width="80%"
            @ok="handleSaveFile"
            @cancel="handleCancelEdit"
        >
            <a-textarea 
                v-model:value="fileContent" 
                :auto-size="{ minRows: 15, maxRows: 30 }"
                placeholder="File content..."
            />
        </a-modal>

        <input 
            ref="fileInputRef" 
            type="file" 
            style="display: none" 
            @change="handleFileInputChange"
            multiple
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fs } from '@/userdata'
import { useAppStateStore } from '@/stores/appState'
import { message, Modal } from 'ant-design-vue'
import { 
    FolderAddOutlined, 
    FileAddOutlined, 
    DeleteOutlined, 
    EditOutlined,
    HomeOutlined,
    UploadOutlined,
    DownloadOutlined
} from '@ant-design/icons-vue'

onMounted(() => {
    useAppStateStore().setTitle('File Browser (Debug)')
    loadFiles()
})

const currentPath = ref('')
const selectedRowKeys = ref<string[]>([])
const fileList = ref<Array<{
    name: string
    isDirectory: boolean
    size: number
    modified: Date
}>>([])

const createFolderVisible = ref(false)
const createFileVisible = ref(false)
const renameVisible = ref(false)
const viewFileVisible = ref(false)
const newFolderName = ref('')
const newFileName = ref('')
const newName = ref('')
const fileContent = ref('')
const currentEditingFile = ref('')
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

const getSelectedItems = () => {
    if (selectedRowKeys.value.length === 0) return []
    return fileList.value.filter(item => selectedRowKeys.value.includes(item.name))
}

const onSelectChange = (keys: string[]) => {
    selectedRowKeys.value = keys
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
    selectedRowKeys.value = []
    loadFiles()
}

const getPathUpTo = (index: number) => {
    return pathSegments.value.slice(0, index + 1).join('/')
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

const handleDelete = () => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) return

    Modal.confirm({
        title: 'Confirm Delete',
        content: `Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
            try {
                const path = currentPath.value || '/'
                
                await Promise.all(
                    selectedItems.map(async (item) => {
                        const fullPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`
                        if (item.isDirectory) {
                            await fs.rm(fullPath, { recursive: true, force: true })
                        } else {
                            await fs.unlink(fullPath)
                        }
                    })
                )
                
                message.success(`Deleted ${selectedItems.length} item(s) successfully`)
                selectedRowKeys.value = []
                loadFiles()
            } catch (error) {
                console.error('Error deleting:', error)
                message.error('Failed to delete')
            }
        }
    })
}

const handleRename = () => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) return
    if (selectedItems.length > 1) {
        message.warning('Please select only one item to rename')
        return
    }
    // @ts-ignore
    newName.value = selectedItems[0].name
    renameVisible.value = true
}

const handleRenameOk = async () => {
    if (!newName.value.trim()) {
        message.warning('Please enter a new name')
        return
    }

    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) return

    try {
        const path = currentPath.value || '/'
        // @ts-ignore
        const oldPath = path === '/' ? `/${selectedItems[0].name}` : `${path}/${selectedItems[0].name}`
        const newPath = path === '/' ? `/${newName.value}` : `${path}/${newName.value}`
        
        await fs.rename(oldPath, newPath)
        message.success('Renamed successfully')
        renameVisible.value = false
        selectedRowKeys.value = []
        loadFiles()
    } catch (error) {
        console.error('Error renaming:', error)
        message.error('Failed to rename')
    }
}

const handleUpload = () => {
    fileInputRef.value?.click()
}

const handleFileInputChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const files = target.files
    
    if (!files || files.length === 0) return

    try {
        const path = currentPath.value || '/'
        const selectedItems = getSelectedItems()
        // @ts-ignore
        const targetDir = selectedItems.length === 1 && selectedItems[0].isDirectory ? selectedItems[0].name : ''
        
        await Promise.all(
            Array.from(files).map(async (file) => {
                let fullPath: string
                if (targetDir) {
                    fullPath = path === '/' ? `/${targetDir}/${file.name}` : `${path}/${targetDir}/${file.name}`
                } else {
                    fullPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`
                }
                
                const content = await file.arrayBuffer()
                await fs.writeFile(fullPath, new Uint8Array(content))
            })
        )
        
        message.success(`Uploaded ${files.length} file(s) successfully`)
        loadFiles()
    } catch (error) {
        console.error('Error uploading file:', error)
        message.error('Failed to upload file')
    }
    
    if (target) {
        target.value = ''
    }
}

const handleDownload = async () => {
    const selectedItems = getSelectedItems()
    if (selectedItems.length === 0) {
        message.warning('Please select a file to download')
        return
    }

    const filesToDownload = selectedItems.filter(item => !item.isDirectory)
    if (filesToDownload.length === 0) {
        message.warning('Please select at least one file to download')
        return
    }

    try {
        const path = currentPath.value || '/'
        
        await Promise.all(
            filesToDownload.map(async (item) => {
                const fullPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`
                
                const content = await fs.readFile(fullPath)
                const blob = new Blob([new Uint8Array(content)])
                const url = URL.createObjectURL(blob)
                
                const a = document.createElement('a')
                a.href = url
                a.download = item.name
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            })
        )
        
        message.success(`Downloaded ${filesToDownload.length} file(s) successfully`)
    } catch (error) {
        console.error('Error downloading file:', error)
        message.error('Failed to download file')
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

const handleRowClick = async (record: any) => {
    if (record.isDirectory) {
        const path = currentPath.value || '/'
        const newPath = path === '/' ? `/${record.name}` : `${path}/${record.name}`
        navigateToPath(newPath)
    } else {
        const fileName = record.name.toLowerCase()
        const isTextFile = fileName.endsWith('.txt') || fileName.endsWith('.json')
        const maxSize = 128 * 1024
        
        if (isTextFile && record.size <= maxSize) {
            await handlePreviewFile(record)
        } else {
            await handleDownloadFile(record)
        }
    }
}

const handlePreviewFile = async (record: any) => {
    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${record.name}` : `${path}/${record.name}`
        
        const content = await fs.readFile(fullPath)
        
        try {
            const value = new TextDecoder().decode(content)
            if (value[0] === '{' && value.length < (16 * 1024) && value.endsWith('}')) {
                // 尝试格式化JSON
                try {
                    const json = JSON.parse(value)
                    fileContent.value = JSON.stringify(json, null, 4)
                } catch (error) {
                    fileContent.value = value
                }
            }
            else {
                fileContent.value = value
            }
            currentEditingFile.value = fullPath
            viewFileVisible.value = true
        } catch (error) {
            message.warning('Cannot decode file content')
        }
    } catch (error) {
        console.error('Error previewing file:', error)
        message.error('Failed to preview file')
    }
}

const handleSaveFile = async () => {
    if (!currentEditingFile.value) return

    try {
        const content = new TextEncoder().encode(fileContent.value)
        await fs.writeFile(currentEditingFile.value, content)
        message.success('File saved successfully')
        viewFileVisible.value = false
        loadFiles()
    } catch (error) {
        console.error('Error saving file:', error)
        message.error('Failed to save file')
    }
}

const handleCancelEdit = () => {
    currentEditingFile.value = ''
    fileContent.value = ''
    viewFileVisible.value = false
}

const handleDownloadFile = async (record: any) => {
    try {
        const path = currentPath.value || '/'
        const fullPath = path === '/' ? `/${record.name}` : `${path}/${record.name}`
        
        const content = await fs.readFile(fullPath)
        const blob = new Blob([new Uint8Array(content)])
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = record.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        message.success('File downloaded successfully')
    } catch (error) {
        console.error('Error downloading file:', error)
        message.error('Failed to download file')
    }
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
