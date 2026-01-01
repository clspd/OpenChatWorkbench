import { watch } from "vue";
import router from "./router";
import { useAppStateStore } from "./stores/appState";
import { useConfigStore } from "./stores/configStore";
import { useWindowStateStore } from "./stores/windowState"
import { app_name } from "./config";

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

    watch(() => useAppStateStore().title, (title) => {
        document.title = title ? (useAppStateStore().titleCustomize ? title : `${title} - ${app_name}`) : app_name
    })
};
