import 'vue'

declare module 'vue' {
    interface ComponentCustomProperties {
        t: typeof import('i18next').t;
        openInternalLink: (e: Event | string | URL, title?: string) => void;
    }
}
