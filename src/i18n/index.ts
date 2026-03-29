import i18next from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { ref, shallowRef, watch } from 'vue';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import dayjs from 'dayjs';
import enUS from 'ant-design-vue/es/locale/en_US';

const reactiveLanguage = ref(i18next.language);
const displayingLanguage = ref(i18next.language);
const antdvCurrentLanguage = shallowRef(enUS);
export { reactiveLanguage as currentLanguage, displayingLanguage as currentLanguageDisplaying, antdvCurrentLanguage };

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

const supportedAntdvLocales: Record<string, () => Promise<typeof import('ant-design-vue/es/locale/en_US')>> = {
    "en": () => import("ant-design-vue/es/locale/en_US"),
    "zh-CN": () => import("ant-design-vue/es/locale/zh_CN"),
}

async function UpdateVendorI18n(lng: string) {
    if (supportedDayjsLocales[lng]) {
        await supportedDayjsLocales[lng]().then(() => dayjs.locale(lng.toLowerCase()))
    }
    else {
        dayjs.locale("en")
    }
    if (supportedAntdvLocales[lng]) {
        const { default: resource } = await supportedAntdvLocales[lng]();
        antdvCurrentLanguage.value = resource;
    }
    else {
        antdvCurrentLanguage.value = enUS;
    }   
}

export async function SetupI18n() {
    i18next.on('languageChanged', (lng) => {
        reactiveLanguage.value = lng
    })

    watch(() => reactiveLanguage.value, async (lng) => {
        await i18next.changeLanguage(lng)
        await UpdateVendorI18n(lng);
        useAppStatePersistStore().language = displayingLanguage.value = lng
    })

    const lng = useAppStatePersistStore().language

    await i18next
        .use(resourcesToBackend((lng: string, ns: string) =>
            import(`./locales/${lng}/${ns}.json`)
        ))
        .init({
            lng: lng,
            fallbackLng: "en",
            ns: NS,
            defaultNS: 'common',
            interpolation: { escapeValue: false },
            partialBundledLanguages: true,
        });
    await UpdateVendorI18n(lng);
    
    return (((...args: Parameters<typeof i18next.t>) => (displayingLanguage.value, i18next.t(...args)))) as typeof i18next.t;
}
