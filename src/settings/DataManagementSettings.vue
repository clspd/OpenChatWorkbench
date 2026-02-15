<template>
    <div class="sub-settings-container">
        <h2>Data Management</h2>

        <div class="setting-item">
            <a-button @click="cookieConsent">Cookies Consent</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="privacyPolicy">Privacy Policy</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="exportData">Export All Data</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="clearData" danger>Clear All Data</a-button>
        </div>

        <DialogView v-model="clearDataState.show" style="width: 400px;" @closed="cancelClearData" :closable="!clearDataState.deleting">
            <template #title>Are you sure?</template>
            <div>
                This operation will delete
                <b style="color: red;">ALL DATA</b>
                of the application and reset the application to its initial state!
            </div>
            <div style="color: red; font-weight: bold;">THIS OPERATION CANNOT BE UNDONE!</div>
            <hr style="width: 100%;">
            <div>If you want to continue anyway, please type <b style="color: red; user-select: all;">{{ clearDataState.expect }}</b> in the input box below:</div>

            <a-input style="margin: 0.5em 0;" v-model:value="clearDataState.input" :placeholder="`Type '${clearDataState.expect}' to confirm`" :disabled="clearDataState.deleting" />

            <div class="btn-group">
                <a-button @click="confirmClearData" danger type="primary" :disabled="(clearDataState.input !== clearDataState.expect) || clearDataState.deleting">
                    {{ clearDataState.deleting ? 'Deleting...' : 'Confirm' }}
                </a-button>
                <a-button @click="clearDataState.show = false" :disabled="clearDataState.deleting">Cancel</a-button>
            </div>
        </DialogView>

        <hr style="width: 100%;">

        <div class="setting-item">
            <a-checkbox v-model:checked="optOutUsageReport">Opt out of usage report</a-checkbox>
            <br>
            <b>Explaination:</b>
            <span>&nbsp;The application collects anonymous usage data to help improve the application. However, you can opt out of usage report if you want.</span>
            <span>&nbsp;If you opt out of usage report, the application will not collect any usage data.</span>
            <span>&nbsp;To learn more, refer to the <a href="/resource/privacy.html" target="_blank">Privacy Policy</a>.</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStateStore } from '@/stores/appState'
import { message, Modal } from 'ant-design-vue'
import { db, db_name } from '@/userdata'
import { DialogView } from 'vue-dialog-view'

onMounted(() => {
    useAppStateStore().setTitle('Data Management Settings')
    db.get('config', 'user.privacy.optOutUsageReport').then((value) => {
        optOutUsageReport.value = value ?? false;
    }).catch(() => {
        message.error('Failed to get opt out of usage report');
    })
})

const cookieConsent = () => {
    useAppStateStore().showCookieConsent = true;
}

const privacyPolicy = () => {
    window.open('/resource/privacy.html', '_blank');
}

const exportData = () => {
    message.error("Export data is not implemented yet in the canary channel");
}

const clearDataState = ref<{
    show: boolean;
    resolver?: (value: boolean) => void;
    input: string;
    expect: string;
    deleting: boolean;
}>({
    show: false,
    input: '',
    expect: 'delete all data',
    deleting: false,
});
const clearData = async () => {
    if (!await new Promise(r => Modal.confirm({
        title: 'Clear All Data',
        content: 'Are you sure you want to clear all data?\nThis action cannot be undone!',
        okText: 'Next Step',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => r(true),
        onCancel: () => r(false),
    }))) return;
    // confirm dialog
    clearDataState.value.show = true;
    const result = await new Promise<boolean>(resolve => clearDataState.value.resolver = resolve);
    if (!result) return;
    clearDataState.value.deleting = true;

    const req = indexedDB.deleteDatabase(db_name);
    await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    window.location.reload();
}
const confirmClearData = () => {
    if (clearDataState.value.input !== clearDataState.value.expect) return message.error('Input does not match');
    clearDataState.value.resolver?.(true);
    clearDataState.value.resolver = undefined;
}
const cancelClearData = () => {
    clearDataState.value.resolver?.(false);
    clearDataState.value.resolver = undefined;
}

const optOutUsageReport = ref(false);
watch(() => optOutUsageReport.value, async (newValue) => {
    try {
        const currentSetting = await db.get('config', 'user.privacy.optOutUsageReport');
        if (currentSetting === newValue) return;
        await db.put('config', newValue, 'user.privacy.optOutUsageReport');
        message.success('The operation has completed successfully.');
        window.location.reload();
    } catch (error) {
        message.error('Failed: ' + error);
    }
})
</script>

<style scoped>
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

h2 {
    margin: 0;
}

.btn-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
}

</style>
