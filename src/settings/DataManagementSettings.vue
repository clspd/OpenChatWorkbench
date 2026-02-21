<template>
    <div class="sub-settings-container">
        <h2>{{ t('settings:data_management.title') }}</h2>

        <div class="setting-item">
            <a-button @click="cookieConsent">{{ t('settings:data_management.cookiesConsent') }}</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="privacyPolicy">{{ t('settings:data_management.privacyPolicy') }}</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="portData">{{ t('settings:data_management.importExportData') }}</a-button>
        </div>

        <div class="setting-item">
            <a-button @click="deleteAllConversations" danger>{{ t('settings:data_management.deleteAllConversations') }}</a-button>
        </div>

        <hr style="width: 100%;">

        <div class="setting-item">
            <a-button type="primary" @click="clearData" danger>{{ t('settings:data_management.clearAllData') }}</a-button>
        </div>

        <DialogView v-model="clearDataState.show" style="width: 400px;" @closed="cancelClearData" :closable="!clearDataState.deleting">
            <template #title>{{ t('settings:data_management.clearData.title') }}</template>
            <div>
                {{ t('settings:data_management.clearData.content') }}
                <b style="color: red;">{{ t('settings:data_management.clearData.allData') }}</b>
                {{ t('settings:data_management.clearData.resetApp') }}!
            </div>
            <div v-if="clearDataState.deleting" style="color: red; font-weight: bold;">{{ t('settings:data_management.clearData.deleting') }}</div>
            <div v-else style="color: red; font-weight: bold;">{{ t('settings:data_management.clearData.cannotBeUndone') }}</div>
            <hr style="width: 100%;">
            <div>{{ t('settings:data_management.clearData.continueAnyway') }} <b style="color: red; user-select: all;">{{ clearDataState.expect }}</b> {{ t('settings:data_management.clearData.inInputBoxBelow') }}:</div>

            <a-input style="margin: 0.5em 0;" v-model:value="clearDataState.input" :placeholder="t('settings:data_management.clearData.typeToConfirm', { expect: clearDataState.expect })" :disabled="clearDataState.deleting" />

            <div class="btn-group">
                <a-button @click="confirmClearData" danger type="primary" :disabled="(clearDataState.input !== clearDataState.expect) || clearDataState.deleting" :loading="clearDataState.deleting">
                    {{ clearDataState.deleting ? t('settings:data_management.clearData.deleting') : t('settings:data_management.clearData.confirm') }}
                </a-button>
                <a-button @click="clearDataState.show = false" :disabled="clearDataState.deleting">{{ t('settings:data_management.clearData.cancel') }}</a-button>
            </div>
        </DialogView>

        <DialogView v-model="clearDataState.deleted" style="width: 400px;" :closable="false">
            <template #title>{{ t('settings:data_management.dataDeleted.title') }}</template>
            <div style="margin-bottom: 1em;">
                {{ t('settings:data_management.dataDeleted.content') }}
            </div>
            <div class="btn-group">
                <a-button @click="closeApp" type="primary">{{ t('settings:data_management.dataDeleted.closeApp') }}</a-button>
                <a-button @click="reloadApp">{{ t('settings:data_management.dataDeleted.reloadApp') }}</a-button>
            </div>
        </DialogView>

        <hr style="width: 100%;">

        <div class="setting-item">
            <a-checkbox v-model:checked="optOutUsageReport">{{ t('settings:data_management.usageReport.optOut') }}</a-checkbox>
            <br>
            <b>{{ t('settings:data_management.usageReport.explanation') }}</b>
            <span>&nbsp;{{ t('settings:data_management.usageReport.description') }}</span>
            <span>&nbsp;{{ t('settings:data_management.usageReport.optOutDescription') }}</span>
            <span>&nbsp;{{ t('settings:data_management.usageReport.toLearnMore') }} <a :href="privacy_policy_href" target="_blank">{{ t('settings:data_management.usageReport.privacyPolicy') }}</a>.</span>
        </div>

        <div class="setting-item">
            <a-checkbox v-model:checked="optOutCSPReport">{{ t('settings:data_management.cspReport.optOut') }}</a-checkbox>
            <br>
            <b>{{ t('settings:data_management.cspReport.explanation') }}</b>
            <span>&nbsp;{{ t('settings:data_management.cspReport.description') }}</span>
            <span>&nbsp;{{ t('settings:data_management.cspReport.optOutDescription') }}</span>
            <span><br><b>{{ t('settings:data_management.cspReport.whyNotRecommend') }}</b> {{ t('settings:data_management.cspReport.whyNotRecommendDescription') }}&nbsp;{{ t('settings:data_management.cspReport.toLearnMore') }} <a :href="privacy_policy_href" target="_blank">{{ t('settings:data_management.cspReport.privacyPolicy') }}</a>.</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineComponent, h } from 'vue'
import { useAppStateStore } from '@/stores/appState'
import { message, Modal } from 'ant-design-vue'
import { db, db_name, fs, setShowDbExpiredDialog } from '@/userdata'
import { DialogView } from 'vue-dialog-view'
import { useRouter } from 'vue-router'
import { domain_name_root, privacy_policy_href } from '@/config'
import { parse } from 'cookie'
import { isServiceWorkerActive } from '@/utils/swApi'
import { chatAttachmentBasePath, chatIndexBasePath, getConvPath, getConvPrefPath } from '@/modules/chat/path'
import { t } from 'i18next'

const router = useRouter()

onMounted(() => {
    useAppStateStore().setTitle(t('settings:data_management.title'))
    db.get('config', 'user.privacy.optOutUsageReport').then((value) => {
        optOutUsageReport.value = value ?? false;
    }).catch(() => {
        message.error(t('settings:data_management.usageReport.failedToGetOptOut'));
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
    deleted: boolean;
}>({
    show: false,
    input: '',
    expect: 'delete all data',
    deleting: false,
    deleted: false,
});
const clearData = async () => {
    if (!await new Promise(r => Modal.confirm({
        title: t('settings:data_management.messages.clearAllData.title'),
        content: t('settings:data_management.messages.clearAllData.content'),
        okText: t('settings:data_management.messages.clearAllData.okText'),
        okType: 'danger',
        cancelText: t('settings:data_management.messages.clearAllData.cancelText'),
        onOk: () => r(true),
        onCancel: () => r(false),
    }))) return;
    // confirm dialog
    clearDataState.value.show = true;
    const result = await new Promise<boolean>(resolve => clearDataState.value.resolver = resolve);
    if (!result) return;
    clearDataState.value.deleting = true;

    setShowDbExpiredDialog(false);
    const req = indexedDB.deleteDatabase(db_name);
    await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    document.cookie = `sys.operation.clearAllData=yes; path=/; max-age=3600; secure`;
    await fetch('/', { cache: 'no-store' }).catch(() => { });
    await new Promise(resolve => setTimeout(resolve, 2000));
    // clearDataState.value.deleted = true;
    location.href = '/resource/cleared.html';
}
const confirmClearData = () => {
    if (clearDataState.value.input !== clearDataState.value.expect) return message.error(t('settings:data_management.messages.inputDoesNotMatch'));
    clearDataState.value.resolver?.(true);
    clearDataState.value.resolver = undefined;
}
const cancelClearData = () => {
    clearDataState.value.resolver?.(false);
    clearDataState.value.resolver = undefined;
}
const reloadApp = () => {
    window.location.reload();
}
const closeApp = () => {
    document.open();
    // @ts-ignore
    document.write("<h1>" + t('settings:data_management.messages.pleaseCloseTab'));
    setTimeout(w => w?.close(), 100, window.open('about:blank', '_self'));
    window.close();
    document.close();
}

const deleteAllConversations = async () => {
    let countdown = 5, cid: ReturnType<typeof setInterval>, m: ReturnType<typeof Modal.confirm>;
    if (!await new Promise(r => m = Modal.confirm({
        title: t('settings:data_management.messages.deleteAllConversations.title'),
        content: h(defineComponent({
            render: () => h('div', null, t('settings:data_management.messages.deleteAllConversations.content')),
            mounted: () => cid = setInterval(() => {
                const ended = --countdown <= 0;
                if (ended) clearInterval(cid);
                m.update({
                    okText: ended ? t('settings:data_management.messages.deleteAllConversations.confirm', { countdown: 0 }) : t('settings:data_management.messages.deleteAllConversations.confirm', { countdown }),
                    okButtonProps: {
                        type: 'primary',
                        disabled: !ended,
                    },
                })
            }, 1000),
            beforeUnmount: () => (clearInterval(cid)),
        })),
        okText: t('settings:data_management.messages.deleteAllConversations.confirm', { countdown }),
        okType: 'danger',
        okButtonProps: {
            type: 'primary',
            disabled: true,
        },
        cancelText: t('settings:data_management.messages.clearAllData.cancelText'),
        onOk: () => r(true),
        onCancel: () => r(false),
    }))) return;
    const loadingEl = document.createElement('dialog');
    loadingEl.append(document.createTextNode(t('settings:data_management.messages.deleteAllConversations.deleting')))
    document.body.append(loadingEl);
    (loadingEl as any).closedBy = 'none';
    loadingEl.showModal();
    try {
        await fs.rm(chatIndexBasePath, { recursive: true });
        await fs.rm(chatAttachmentBasePath, { recursive: true });
        await fs.rm(getConvPath(''), { recursive: true });
        await fs.rm(getConvPrefPath(''), { recursive: true });
    }
    catch (e) {
        message.error(t('settings:data_management.messages.deleteAllConversations.failed', { error: e }));
    }
    finally {
        window.location.reload();
    }
}

const optOutUsageReport = ref(false);
watch(() => optOutUsageReport.value, async (newValue) => {
    try {
        const currentSetting = await db.get('config', 'user.privacy.optOutUsageReport');
        if (currentSetting === newValue) return;
        await db.put('config', newValue, 'user.privacy.optOutUsageReport');
        message.success(t('settings:data_management.messages.operationCompleted'));
        window.location.reload();
    } catch (error) {
        message.error(t('settings:data_management.messages.failed', { error }));
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
        document.cookie = `sys.operation.clearCache=yes; path=/; max-age=3600; secure`;

        message.info(t('settings:data_management.messages.processing'));
        if (await isServiceWorkerActive()) {
            const c = (window as any).appInitConfig;
            const cache = await caches.open(c.CACHE_PREFIX + c.CACHE_VERSION);
            const u = new URL("/", window.location.href);
            await cache.delete(u, { ignoreSearch: true });
            const newResp = await fetch(u, { cache: 'no-store' });
            await cache.put(u, newResp);
        }
        else {
            for (let i = 0; i < 2; i++) {
                document.cookie = `sys.operation.clearCache=yes; path=/; max-age=3600; secure`;
                await (await fetch(location.href, { cache: 'no-store' })).arrayBuffer();
            }
        }
        message.success(t('settings:data_management.messages.operationCompleted'));
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        message.error(t('settings:data_management.messages.failed', { error }));
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
