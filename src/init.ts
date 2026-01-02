import { watch } from "vue";
import router from "./router";
import { useAppStateStore } from "./stores/appState";
import { useAppStatePersistStore } from "./stores/appStatePersist";
import { useConfigStore } from "./stores/configStore";
import { useWindowStateStore } from "./stores/windowState"
import { app_name } from "./config";
import { useAppStateSessionStore } from "./stores/appStateSession";
import { useConversationStore } from "./stores/conversationStore";
import '@/utils/appInstanceDetector'

export default async function init() {
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
};
