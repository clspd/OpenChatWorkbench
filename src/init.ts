import router from "./router";
import { useAppStateStore } from "./stores/appState";
import { useWindowStateStore } from "./stores/windowState"

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
};
