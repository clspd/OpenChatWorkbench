<template>
    <DialogView
        v-model="appState.showCookieConsent"
        :closable="false"
        class="cookie-consent"
    >
        <template #title>{{ isLoading ? "Loading Data, Please Wait" : "We Value Your Privacy" }}</template>

        <div class="cookie-consent-container">
            <div v-if="isLoading" class="loading-overlay"></div>
            <h2>Cookies Consent Center</h2>

            <div class="info">
                <b>Cookies</b>
                <span>&nbsp;are small text files that websites store on your device to remember your preferences and provide a more personalized experience.</span>
                <span>&nbsp;To ensure the best experience, we use cookies to store your preferences, provide a more personalized experience and help us improve our services.</span>
                <span>&nbsp;However, these cookies are optional except for the necessary ones that enable the core functionality of the website. You can turn off optional cookies in the area below.</span>
                <br>
                <b>To learn more</b>
                <span>, please visit our </span>
                <a href="/resource/privacy.html" target="_blank">Privacy Policy</a>
                <span>.</span>
            </div>

            <h2>Manage Consent Preferences</h2>

            <a-collapse v-model:active-key="activeKey">
                <a-collapse-panel
                    key="necessary"
                    header="Necessary Cookies"
                >
                    <div class="info">
                        <b>Necessary Cookies</b>
                        <span>&nbsp;are essential for the website to function properly. They enable core features such as navigation, login, and content display.</span>
                    </div>

                    <template #extra>
                        <div class="always-active-text">Always Active</div>
                    </template>
                </a-collapse-panel>

                <a-collapse-panel
                    key="performance"
                    header="Performance Cookies"
                >
                    <div class="info">
                        <b>Performance Cookies</b>
                        <span>&nbsp;help us improve the website's performance by analyzing how users interact with it. They collect information such as page load times, user behavior, and traffic sources.</span>
                    </div>

                    <template #extra>
                        <span @click.stop><a-switch v-model:checked="status.performance" /></span>
                    </template>
                </a-collapse-panel>

                <a-collapse-panel
                    key="functional"
                    header="Functional Cookies"
                >
                    <div class="info">
                        <b>Functional Cookies</b>
                        <span>&nbsp;are used to store your preferences and enable specific features on the website. If disabled, some features may not work as expected.</span>
                    </div>

                    <template #extra>
                        <span @click.stop><a-switch v-model:checked="status.functional" /></span>
                    </template>
                </a-collapse-panel>

                <a-collapse-panel
                    key="targeting"
                    header="Targeting Cookies"
                >
                    <div class="info">
                        <b>Targeting Cookies</b>
                        <span>&nbsp;are used to personalize content and ads based on your interests and behavior. They help us show you relevant content and advertisements that may interest you.</span>
                    </div>

                    <template #extra>
                        <span @click.stop><a-switch v-model:checked="status.targeting" /></span>
                    </template>
                </a-collapse-panel>
            </a-collapse>

            <div class="warning" v-if="!status.functional">
                <b>Warning:</b>
                <span>&nbsp;Disabling functional cookies may affect the website's functionality. It is highly recommended to keep them enabled to ensure all features work as expected and provide a smooth user experience.</span>
            </div>

            <div class="info">Note: After changing your consent preferences, a page reload is required for the changes to take effect.</div>

            <div class="buttons-container">
                <a-button type="primary" @click="saveConsent">Confirm my choices</a-button>
                <a-button @click="allowAll">Allow All</a-button>
                <a-button @click="necessaryOnly">Necessary Only</a-button>
                <a-button danger @click="quitApp">Quit Application</a-button>
            </div>
        </div>

        <template #footer>
            <div class="info" style="text-align: right; font-size: 0.5em;">Powered by <b>OpenChatWorkbench</b></div>
        </template>

        <DialogView v-model="showConfirmDialog" @closed="dlg.cancel?.()">
            <template #title>Are you sure?</template>
            <template #footer>
                <div class="buttons-container">
                    <a-button @click="showConfirmDialog = false">Cancel</a-button>
                    <a-button danger @click="dlg.confirm?.()">Confirm</a-button>
                </div>
            </template>
        </DialogView>
    </DialogView>
</template>

<script setup lang="ts">
import { onMounted, ref, toRaw, watch } from 'vue';
import { DialogView } from 'vue-dialog-view';
import { useAppStateStore } from '@/stores/appState';
import type { CookieConsent } from '@/types/cookieConsent';
import { createBaseCookieConsent, getCookieConsent, setCookieConsent } from '@/utils/cookieConsent';
import { analytics_base_url, cookie_consent_updated_at } from '@/config';
import { NON_EU_MAJOR } from '@/modules/statistics/NonEuMajor';

const appState = useAppStateStore();

const activeKey = ref(['necessary', 'performance', 'functional', 'targeting']);
const status = ref<CookieConsent>(createBaseCookieConsent());
const isLoading = ref(true);

watch(() => appState.showCookieConsent, async (newValue: boolean) => {
    if (newValue) try {
        isLoading.value = true;
        const stat = await getCookieConsent();
        if (stat) status.value = stat;
        else {
            const base = createBaseCookieConsent();
            const resp = await fetch(new URL("./country", analytics_base_url));
            if (!resp.ok) throw new Error(`Failed to get country: ${resp.status}`);
            const country = (await resp.text()).toUpperCase();
            if (NON_EU_MAJOR.has(country)) {
                // for non-europe users, enable all cookies by default (user can still edit the preferences)
                base.performance = base.functional = base.targeting = true;
                // for non-europe users, collapse all items by default
                activeKey.value.length = 0;
            }
            status.value = base;
        }
    } catch { status.value = createBaseCookieConsent(); } finally { isLoading.value = false; }
}, { immediate: true })

const showConfirmDialog = ref(false);
const dlg = ref<{
    confirm?: () => void,
    cancel?: () => void,
}>({
    confirm: undefined,
    cancel: undefined,
});
const confirm = () => new Promise<boolean>((resolve, reject) => {
    dlg.value.confirm = () => resolve(true);
    dlg.value.cancel = () => resolve(false);
    showConfirmDialog.value = true;
})

const saveConsent = async () => {
    if (!status.value.functional) if (!await confirm()) return;
    const value = toRaw(status.value);
    value.updatedAt = cookie_consent_updated_at;
    console.log('[consent]', 'User save cookie consent:', value);
    await setCookieConsent(value);
    window.location.reload();
}
const allowAll = async () => {
    status.value = createBaseCookieConsent();
    status.value.performance = true;
    status.value.functional = true;
    status.value.targeting = true;
    saveConsent();
}
const necessaryOnly = async () => {
    if (!await confirm()) return;
    status.value = createBaseCookieConsent();
    saveConsent();
}
const quitApp = async () => {
    if (!await confirm()) return;
    const w = window.open('about:blank', '_self')
    setTimeout(() => {
        w?.close();
    }, 100);
    window.close();
}
</script>

<style scoped>
.cookie-consent {
    width: 640px;
    word-break: normal;
}

.loading-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    margin-bottom: 0;
    z-index: 1;
}

.cookie-consent-container {
    position: relative;
}
:where(.cookie-consent-container > *) {
    margin-top: 0;
    margin-bottom: 10px;
}
.cookie-consent-container > *:last-child {
    margin-bottom: 0;
}

h2 {
    font-size: 1.2em;
    font-weight: bold;
    color: var(--text-secondary-color, rgba(0, 0, 0, 0.65));
}

.info {
    color: var(--text-tertiary-color, rgba(0, 0, 0, 0.45));
}

.always-active-text {
    color: var(--text-primary-color, #1677ff);
}

.warning {
    color: var(--text-warning-color, #faad14);
}

.buttons-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5em;
}
</style>
