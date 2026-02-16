import { watch } from "vue";
import router from "./router";
import '@/utils/appInstanceDetector'
import { registerServiceWorker } from "./utils/swApi";
import { useAppStateStore } from "./stores/appState";
import { useAppStatePersistStore } from "./stores/appStatePersist";
import { useConfigStore } from "./stores/configStore";
import { useWindowStateStore } from "./stores/windowState"
import { app_name, cookie_consent_updated_at, domain_name_canary, domain_name_stable } from "./config";
import { useAppStateSessionStore } from "./stores/appStateSession";
import { useConversationStore } from "./stores/conversationStore";
import { sendUsageReport } from "./utils/sendStatistics";
import { InitCookieConsent, isFunctionalCookieConsented } from "./utils/cookieConsent";
import { db } from "./userdata";
import { DYNDATA } from "./dynamic";
import { setupErrorHandler } from "./utils/errorHandler";
import { createChatBaseStructure } from "./modules/chat/path";
import { InitConvIndex } from "./modules/chat/convIndex";

export default async function init() {
    // register service worker
    await registerServiceWorker()

    const onResize = () => {
        const { updateWindowSize } = useWindowStateStore()
        updateWindowSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize);
    onResize();

    router.afterEach((to, from) => {
        const { setPage } = useAppStateStore()
        setPage(to.name)
    })

    await InitCookieConsent(cookie_consent_updated_at);

    const { loadConfig, initAutoSave } = useConfigStore();
    await loadConfig();
    initAutoSave();

    if (!await isFunctionalCookieConsented()) { 
        // clear the kv store, which stores user preferences
        await db.clear('kv');
    }
    await setupErrorHandler();

    await createChatBaseStructure();

    const { load: loadAppStateAutoSave, initAutoSave: initAppStateAutoSave } = useAppStatePersistStore();
    await loadAppStateAutoSave();
    initAppStateAutoSave();

    const { load: loadAppStateSession, initAutoSave: initAppStateSessionAutoSave, cleanup: cleanupAppStateSession } = useAppStateSessionStore()
    await loadAppStateSession();
    initAppStateSessionAutoSave();
    cleanupAppStateSession();

    watch(() => useAppStateStore().title, (title) => {
        document.title = title ? (useAppStateStore().titleCustomize ? title : `${title} - ${app_name}`) : app_name
    });

    useConversationStore();

    await InitConvIndex();
    
    if (await isFunctionalCookieConsented()) fetch('/resource/offline@1.0.0.html').catch(() => {});

    if (window.location.hostname === domain_name_canary) {
        const { showCanaryWarning, addCanaryWatermark, addRevHash } = await import('./utils/canaryEnv');
        showCanaryWarning();
        (window as any).removeCanaryWatermark = addCanaryWatermark();
        addRevHash();
        sendUsageReport('An user is using the canary version of OpenChatWorkbench. Version is ' + DYNDATA.commithash).catch(e => console.log('[statistics] Failed to send usage report:' + e));
    }
    if (window.location.hostname === domain_name_stable) {
        sendUsageReport('An user is using the stable version of OpenChatWorkbench. Version is ' + DYNDATA.commithash).catch(e => console.log('[statistics] Failed to send usage report:' + e));
    }
    

};
