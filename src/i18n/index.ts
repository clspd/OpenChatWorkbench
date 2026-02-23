import i18next from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { ref, watch } from 'vue';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import dayjs from 'dayjs';

const reactiveLanguage = ref(i18next.language)
export { reactiveLanguage as currentLanguage }

const NS = [
    'common',
    'chat',
    'workspace',
    'configGuide',
    'interop',
    'settings',
    'about',
]

const supportedDayjsLocales: Record<string, () => Promise<any>> = {
    "en": () => import("dayjs/locale/en"),
    "zh-CN": () => import("dayjs/locale/zh-cn"),
}

export async function SetupI18n() {
    i18next.on('languageChanged', (lng) => {
        reactiveLanguage.value = lng
    })

    watch(() => reactiveLanguage.value, (lng) => {
        i18next.changeLanguage(lng)
        if (supportedDayjsLocales[lng]) {
            supportedDayjsLocales[lng]().then(() => dayjs.locale(lng.toLowerCase()))
        }
        else {
            dayjs.locale("en")
        }
        useAppStatePersistStore().language = lng
    })

    const lng = useAppStatePersistStore().language

    await i18next
        .use(resourcesToBackend((lng: string, ns: string) =>
            importModuleEx(`/assets/locales/${lng}/${ns}.json`, {
                with: {
                    type: "json"
                }
            })
        ))
        .init({
            lng: lng,
            fallbackLng: "en",
            ns: NS,
            defaultNS: 'common',
            interpolation: { escapeValue: false },
            partialBundledLanguages: true,
        });
    if (supportedDayjsLocales[lng]) {
        await supportedDayjsLocales[lng]().then(() => dayjs.locale(lng.toLowerCase()))
    }
    else {
        dayjs.locale("en")
    }

    return (((...args: Parameters<typeof i18next.t>) => (reactiveLanguage.value, i18next.t(...args)))) as typeof i18next.t;
}
