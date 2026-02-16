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
            <a-button @click="portData">Import &amp; Export Data</a-button>
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
            <span>&nbsp;To learn more, refer to the <a :href="privacy_policy_href" target="_blank">Privacy Policy</a>.</span>
        </div>

        <div class="setting-item">
            <a-checkbox v-model:checked="optOutCSPReport">Opt out of CSP report (Not recommended)</a-checkbox>
            <br>
            <b>Explaination:</b>
            <span>&nbsp;The application collects Content Security Policy (CSP) violation report data to ensure the security of the application.</span>
            <span>&nbsp;If you opt out of CSP report, the application will not send CSP report data anymore.</span>
            <span><br><b>Why not recommend to opt out?</b> CSP report data is used to identity the potential hacking attempts and improve the security of the application. It doesn't contain any personal or sensitive information.&nbsp;However, if you are very privacy-conscious, you can still opt out of CSP report.</span>
            <span>&nbsp;To learn more, refer to the <a :href="privacy_policy_href" target="_blank">Privacy Policy</a>.</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAppStateStore } from '@/stores/appState'
import { message, Modal } from 'ant-design-vue'
import { db, db_name } from '@/userdata'
import { DialogView } from 'vue-dialog-view'
import { useRouter } from 'vue-router'
import { domain_name_root, privacy_policy_href } from '@/config'
import { parse } from 'cookie'
import { isServiceWorkerActive } from '@/utils/swApi'

const router = useRouter()

onMounted(() => {
    useAppStateStore().setTitle('Data Management Settings')
    db.get('config', 'user.privacy.optOutUsageReport').then((value) => {
        optOutUsageReport.value = value ?? false;
    }).catch(() => {
        message.error('Failed to get opt out of usage report');
    });
    if (parse(document.cookie)['user.privacy.optOutCSPReport'] === 'true') optOutCSPReport.value = true;
})

const cookieConsent = () => {
    useAppStateStore().showCookieConsent = true;
}

const privacyPolicy = () => {
    window.open(privacy_policy_href, '_blank');
}

const portData = () => {
    router.push('/interop/data-import-and-export');
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
const optOutCSPReport = ref(false);
watch(() => optOutCSPReport.value, async (newValue) => {
    try {
        const currentSetting = parse(document.cookie)['user.privacy.optOutCSPReport'] === 'true';
        if (currentSetting === newValue) return;
        if (newValue) {
            // add the cookie
            document.cookie = `user.privacy.optOutCSPReport=true; path=/; domain=${domain_name_root}; max-age=63072000; secure`;
        } else {
            // delete the cookie
            document.cookie = `user.privacy.optOutCSPReport=; path=/; domain=${domain_name_root}; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure`;
        }
        if (await isServiceWorkerActive()) {
            message.info("Processing, please wait...");
            const c = (window as any).appInitConfig;
            const cache = await caches.open(c.CACHE_PREFIX + c.CACHE_VERSION);
            const u = new URL("/", window.location.href);
            await cache.delete(u, { ignoreSearch: true });
            const newResp = await fetch(u, { cache: 'no-store' });
            await cache.put(u, newResp);
            message.success('The operation has completed successfully.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            return;
        }
        
        Modal.confirm({
            title: 'Success',
            content: "We've updated your preference about CSP report. However, the Content Security Policy is a HTTP header (to learn more, refer to https://en.wikipedia.org/wiki/HTTP#message-header-field) and browsers often cache the response provided by the server. This means that you need to Clear Browser Cache (often shown as 'Cached images and files'; do NOT clear 'Website Data & Cookies'!) to have your preference take effect.",
            okText: 'Show me how',
            cancelText: 'Reload the page now',
            onOk() {
                let browserType = /(edg|chrome|firefox|safari|opr)/i.exec(navigator.userAgent)?.[0].toLowerCase();
                if (navigator.userAgent.includes('Edg')) browserType = 'edg'; // Edge's ua after Chrome, leading to misidentification, so we need to manually set it
                else if (navigator.userAgent.includes('OPR')) browserType = 'opera'; // ditto.
                const helperLinks = {
                    'chrome': 'https://support.google.com/chrome/answer/2392709',
                    'firefox': 'https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox',
                    'safari': 'https://support.apple.com/en-us/HT201265',
                    'opera': 'https://help.opera.com/en/latest/web-preferences/#cookies',
                    'edg': 'https://www.bing.com/search?q=how+to+clear+cache+in+edge',
                    'default': 'https://www.google.com/search?q=how+to+clear+browser+cache',
                } as Record<string, string>;
                window.open(helperLinks[browserType ?? 'default'], '_blank');
                return new Promise(() => { });
            },
            onCancel() {
                window.location.reload();
                return new Promise(() => { });
            }
        })
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
