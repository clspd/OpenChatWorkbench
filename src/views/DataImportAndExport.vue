<template>
    <div class="container">
        <h2>Data Import and Export</h2>

        <div class="region">
            <h3>Import Data</h3>
            <p>Import data from a previous export.</p>
            <div>
                <input type="file" autocomplete="off" @change="setInputFile">
            </div>
            <p style="margin-bottom: 0;"><a-button type="primary" @click="importData" :disabled="!fileInput">Import</a-button></p>
            <div style="margin-top: 1em; border-top: 1px solid #ccc; padding-top: 1em;">
                <div><b>See also</b></div>
                <router-link to="/interop/import-provider/">Import from other platform</router-link>
            </div>
        </div>

        <div class="region">
            <h3>Export Data</h3>
            <p>Export data to a file.</p>
            <div class="region">
                <div>Choose the category to export:</div>
                <div><a-checkbox v-model:checked="exportSelectAll">Select All</a-checkbox></div>
                <div v-for="k in Object.keys(exportTypes)" :key="k">
                    <a-checkbox v-model:checked="// @ts-ignore
exportTypes[k][1]">{{ exportTypes[k]?.[0] }}</a-checkbox>
                </div>
            </div>
            <p style="margin-bottom: 0;"><a-button type="primary" @click="exportData">Export</a-button></p>
        </div>

        <DialogView v-model="inProgress" :closable="false" style="margin: auto;">
            <template #title>Operation In Progress</template>
            <div>Please wait while the operation is in progress.</div>
        </DialogView>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useAppStateStore } from '@/stores/appState'
import { message, Modal } from 'ant-design-vue';
import { DialogView } from 'vue-dialog-view';
import { useConfigStore } from '@/stores/configStore';
import { db, fs } from '@/userdata';

onMounted(() => {
    useAppStateStore().setTitle('Data Import and Export')
})

const inProgress = ref(false);

// ----------
// Import

const fileInput = ref<File>();
const setInputFile = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) fileInput.value = target.files[0];
}

const importData = async function () {
    if (!fileInput.value) return message.error('Please select a file to import.');

    // TODO: Implement import data
    message.error('Not implemented yet');
}

// --------
// Export

const exportTypes = reactive<Record<string, [string, boolean]>>({
    providerConfig: ['Provider Config', true],
    providerApiKey: ['-- Include Provider API Key (Sensitive)', false],
    modelConfig: ['Model Config', true],
    selectedProviderAndModel: ['Selected Provider and Model', false],
    modelChooserShowFavoriteOnly: ['Model Chooser: Show Favorite Only', false],
    kvStorage: ['KV Storage', true],
    fileSystem: ['Virtual File System Content', true],
});
const exportSelectAll = computed({
    get: () => {
        return Object.values(exportTypes).every(v => !!v[1]);
    },
    set: (value: boolean) => {
        Object.keys(exportTypes).forEach(k => (exportTypes[k] ?? [])[1] = value);
    }
});

const exportData = async function () {
    if (!Object.values(exportTypes).some(v => !!v[1])) return message.error('Please select at least one category to export.');

    if (exportTypes.providerApiKey?.[1]) if (!await new Promise(r => Modal.confirm({
        title: 'Warning',
        content: 'Exporting provider API keys may expose sensitive information. Are you sure?',
        okText: 'Yes',
        okType: 'danger',
        cancelText: 'No',
        onOk: () => r(true),
        onCancel: () => r(false),
    }))) return message.warning('Please manually uncheck "Provider API Key" if you do not want to export it and then restart the export process.');

    inProgress.value = true;
    await new Promise(resolve => setTimeout(resolve, 1000)); // wait for UI update
    try {
        const files = Object.create(null);

        const configStore = useConfigStore();
        if (exportTypes.providerConfig?.[1]) {
            let providers = JSON.parse(JSON.stringify(configStore.providers));
            if (!exportTypes.providerApiKey?.[1]) {
                // sanitize providers
                for (const k of Object.keys(providers)) {
                    if (providers[k].api_key) providers[k].api_key = '********';
                }
            }
            files['providers.json'] = JSON.stringify(providers, null, 2);
        }
        if (exportTypes.modelConfig?.[1]) {
            files['models.json'] = JSON.stringify(configStore.models, null, 2);
        }
        if (exportTypes.selectedProviderAndModel?.[1]) {
            files['selectedProviderAndModel.json'] = JSON.stringify({
                provider: configStore.selectedProviderId,
                model: configStore.selectedModelId,
            }, null, 2);
        }
        if (exportTypes.modelChooserShowFavoriteOnly?.[1]) {
            files['modelChooserShowFavoriteOnly.json'] = JSON.stringify(configStore.modelChooser_showFavoritesOnly, null, 2);
        }

        // kv storage
        if (exportTypes.kvStorage?.[1]) {
            const storage = Object.create(null);
            for (const k of (await db.getAllKeys('kv'))) {
                storage[String(k)] = await db.get('kv', k);
            }
            files['kv.json'] = JSON.stringify(storage, null, 2);
        }

        // file system
        if (exportTypes.fileSystem?.[1]) {
            // export zenfs data
            const prefix = 'filesystem';
            const processDir = async (dir: string) => {
                for (const item of await fs.readdir(dir)) {
                    const itemPath = dir + item;
                    if (await fs.stat(itemPath).then(s => s.isDirectory())) {
                        await processDir(itemPath + '/');
                    } else {
                        files[prefix + itemPath] = await fs.readFile(itemPath);
                    }
                }
            }
            await processDir('/');
        }

        // pre process
        for (const i in files) {
            if (typeof files[i] === 'string') files[i] = new TextEncoder().encode(files[i]);
        }

        // create a zip
        const fflate = await import('fflate');
        // add delay before heavy tasks
        await new Promise(resolve => setTimeout(resolve, 2000));
        const zip = await new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
            fflate.zip(files, (err, data) => {
                if (err) reject(err);
                // @ts-ignore
                else resolve(data);
            });
        });

        // download the zip
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([zip], { type: 'application/zip' }));
        a.download = 'OpenChatWorkbench_Data.zip';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        message.success('Data exported successfully.');
    }
    catch (e) {
        console.error('[DataImportAndExport]', 'Failed to export data:', e);
        message.error('Failed to export data: ' + e);
    }
    finally {
        inProgress.value = false;
    }
}

</script>

<style scoped>
.container {
    padding: 10px;
}

.container > * {
    margin-bottom: 0.5em;
}

h2, h3 {
    margin: 0;
}

.region {
    border: 1px solid #ccc;
    border-radius: 10px;
    padding: 1em;
}
</style>
