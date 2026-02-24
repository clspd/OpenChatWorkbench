import { useWindowStateStore } from "@/stores/windowState";
import { watch } from "vue";

const vpTag = document.querySelector('head > meta[name="viewport"]');

const heightBreakpoint = 400;

export const initVpWatch = () => watch(() => useWindowStateStore().height, (height) => {
    if (!vpTag) return;
    const content = vpTag.getAttribute("content") || "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content";
    vpTag.setAttribute("content", content.replace(/interactive-widget=(resizes-visual|resizes-content)/, height > heightBreakpoint ? "interactive-widget=resizes-content" : "interactive-widget=resizes-visual"));
}, { immediate: true });
