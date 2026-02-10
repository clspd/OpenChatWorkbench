import { watch } from "vue";
import router from "./router";
import { registerServiceWorker } from "./utils/swApi";
import { useAppStateStore } from "./stores/appState";
import { useAppStatePersistStore } from "./stores/appStatePersist";
import { useConfigStore } from "./stores/configStore";
import { useWindowStateStore } from "./stores/windowState"
import { app_name, domain_name_canary } from "./config";
import { useAppStateSessionStore } from "./stores/appStateSession";
import { useConversationStore } from "./stores/conversationStore";
import '@/utils/appInstanceDetector'

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

    const { loadConfig, initAutoSave } = useConfigStore()
    await loadConfig()
    initAutoSave()

    const { load: loadAppStateAutoSave, initAutoSave: initAppStateAutoSave } = useAppStatePersistStore();
    await loadAppStateAutoSave()
    initAppStateAutoSave();

    const { load: loadAppStateSession, initAutoSave: initAppStateSessionAutoSave, cleanup: cleanupAppStateSession } = useAppStateSessionStore()
    await loadAppStateSession()
    initAppStateSessionAutoSave()
    cleanupAppStateSession()

    watch(() => useAppStateStore().title, (title) => {
        document.title = title ? (useAppStateStore().titleCustomize ? title : `${title} - ${app_name}`) : app_name
    })

    useConversationStore()
    
    fetch('/resource/offline@1.0.0.html').catch(() => {})

    if (1||window.location.hostname === domain_name_canary) {
        const { showCanaryWarning, addCanaryWatermark, addRevHash } = await import('./utils/canaryEnv');
        showCanaryWarning();
        // @ts-expect-error
        window.removeCanaryWatermark = addCanaryWatermark();
        addRevHash();
    }

};
