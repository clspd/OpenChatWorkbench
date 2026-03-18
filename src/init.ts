// init.ts: This initializes the application.

// vendor
import { watch } from "vue";
// router config
import router from "./router";
// config and app data
import { app_name, cookie_consent_updated_at } from "./config";
import { db } from "./userdata";
// modules
import { createChatBaseStructure } from "./modules/chat/path";
import { InitConvIndex } from "./modules/chat/convIndex";
import { InitAttachmentIndex } from "./modules/chat/attachment";
import { setupHotKey } from "./modules/hotkey/hotkey_manager";
// stores
import { useAppStateStore } from "./stores/appState";
import { useAppStatePersistStore } from "./stores/appStatePersist";
import { useConfigStore } from "./stores/configStore";
import { useWindowStateStore } from "./stores/windowState"
import { useAppStateSessionStore } from "./stores/appStateSession";
import { useConversationStore } from "./stores/conversationStore";
// utils
import { registerServiceWorker } from "./utils/swApi";
import { AppSendGeneralReport } from "./utils/sendStatistics";
import { InitCookieConsent, isFunctionalCookieConsented } from "./utils/cookieConsent";
import { setupErrorHandler } from "./utils/errorHandler";
import { IsFirstInstance } from './utils/appInstanceDetector'
import { initVpWatch } from "./utils/metaViewport";
// i18n
import i18next from "i18next";
import { GetTitleI18nKeyByText } from "./i18n/titles";
import { SetupI18n } from "./i18n";


// init: the main init function, which will be called before the app is mounted.
export default async function init(app: ReturnType<typeof import('vue').createApp>) {
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

    app.config.globalProperties.t = await SetupI18n();

    const { load: loadAppStateSession, initAutoSave: initAppStateSessionAutoSave } = useAppStateSessionStore()
    await loadAppStateSession();
    initAppStateSessionAutoSave();

    watch(() => useAppStateStore().title, (title) => {
        if (!useAppStateStore().titleCustomize && !useAppStateStore().titleNoTranslate) title = i18next.t(GetTitleI18nKeyByText(title));
        document.title = title ? (useAppStateStore().titleCustomize ? title : `${title} - ${app_name}`) : app_name
    });

    await i18next.loadNamespaces('settings');

    if (useAppStatePersistStore().fontSizeGlobal) {
        document.documentElement.style.setProperty('--ocw-font-size', useAppStatePersistStore().fontSizeGlobal + 'px');
    }

    useConversationStore();

    await InitConvIndex();
    await InitAttachmentIndex();

    initVpWatch();

    // setup shortcut
    await setupHotKey();
    
    if (await isFunctionalCookieConsented()) fetch('/resource/offline@1.0.0.html').catch(() => {});

    // send usage report
    AppSendGeneralReport().catch(e => console.warn('[report]', 'Unable to send report:', e));
    
    // execute runonce logic
    runonce().catch(e => console.error('[runonce]', 'Runonce failed:', e));

    // temporarily fix the dialog display on Safari
    if (/safari/i.test(navigator.userAgent) && (!/chrom|crios|edg|opr|brave/i.test(navigator.userAgent))) {
        // Caution that this is a temporary hack and should be removed in the future
        document.head.appendChild(document.createElement('style')).textContent = `dialog._b4102a3b79656a37 { height: calc(100vh - 2em); }`
    }
    
    // preload some frequently used modules
    import('@/utils/prompt').catch(() => {});
    
    
};


// runonce: The codes that will only run in the first app instance.
export async function runonce() {
    const isFirstInstance = await IsFirstInstance(5000) && await IsFirstInstance(1000)
    console.log('[runonce]', 'isFirstInstance=', isFirstInstance)
    if (!isFirstInstance) return;
    
    // cleanup temp data
    useAppStateSessionStore().cleanup();

}

