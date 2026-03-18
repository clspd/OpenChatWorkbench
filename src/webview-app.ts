import { createApp } from "vue";
import WebViewApp from "./views/WebViewApp.vue";
import I18NextVue from 'i18next-vue'
import i18next from "i18next";
import resourcesToBackend from "i18next-resources-to-backend";
i18next.options.showSupportNotice = false;

if (window.parent === window.self) {
    document.body.appendChild(document.createElement('div')).append('This page is not intended to be accessed directly.')
}
else if ((() => {
    try { if (parent.location.origin !== location.origin) return true } catch { return true }
})()) {
    document.body.appendChild(document.createElement('div')).append('Forbidden')
}
else {
    await i18next
        .use(resourcesToBackend((lng: string, ns: string) =>
            import(`@/i18n/locales/${lng}/${ns}.json`)
        ))
        .init({
            lng: ((new URL(location.href)).searchParams.get('lang')) || 'en',
            fallbackLng: "en",
            ns: ['common'],
            defaultNS: 'common',
            interpolation: { escapeValue: false },
            partialBundledLanguages: true,
        });
    createApp(WebViewApp).use(I18NextVue, { i18next }).mount(document.body.appendChild(document.createElement('div')));
}
