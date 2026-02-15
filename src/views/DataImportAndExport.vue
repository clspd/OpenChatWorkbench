<template>
    <div class="container">
        <h2>Data Import and Export</h2>

        <div class="region">
            <h3>Import Data</h3>
            <p>Import data from a file.</p>
            <div>
                <input type="file" autocomplete="off" @change="setInputFile">
            </div>
            <p style="margin-bottom: 0;"><a-button type="primary" @click="importData" :disabled="!fileInput">Import</a-button></p>
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
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { useAppStateStore } from '@/stores/appState'
import { message } from 'ant-design-vue';

onMounted(() => {
    useAppStateStore().setTitle('Data Import and Export')
})

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
}

// --------
// Export

const exportTypes = reactive<Record<string, [string, boolean]>>({
    providerConfig: ['Provider Config', true],
    providerApiKey: ['Provider API Key (Sensitive)', false],
    modelConfig: ['Model Config', true],
    selectedProviderAndModel: ['Selected Provider and Model', false],
    modelChooserShowFavoriteOnly: ['Model Chooser: Show Favorite Only', false],
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

    // TODO: Implement export data
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
