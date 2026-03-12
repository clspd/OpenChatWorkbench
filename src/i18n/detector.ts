import { db } from '@/userdata';
import { SUPPORTED_LANGUAGES } from './supported';
import { currentLanguage } from './index';
import { h } from 'vue';
import { isFunctionalCookieConsented } from '@/utils/cookieConsent';
import { useAppStatePersistStore } from '@/stores/appStatePersist';

export function DetectUserLanguage(ignoreUnsupported = false) {
    const userLanguages = navigator.languages;
    if (!userLanguages || userLanguages.length === 0) {
        if (navigator.language && (!ignoreUnsupported || SUPPORTED_LANGUAGES.includes(navigator.language))) {
            return navigator.language;
        }
        return 'en';
    }
    for (const lang of userLanguages) {
        if (SUPPORTED_LANGUAGES.includes(lang)) {
            return lang;
        }
    }
    return ignoreUnsupported ? 'en' : userLanguages[0]!;
}

export async function DetectAndPromptLanguage() {
    const lang = DetectUserLanguage(true);
    if (lang !== 'en') {
        if (!isFunctionalCookieConsented()) return false;
        const shownPrompt = await db.get('kv', 'ui.languagePromptShown');
        if (shownPrompt === true) return false;
        const { notification, message, Button } = await import('ant-design-vue');
        const { QuestionCircleOutlined } = await import('@ant-design/icons-vue');
        const nKey = crypto.randomUUID();
        notification.info({
            message: detector_ui_i18n[lang].title,
            description: detector_ui_i18n[lang].text,
            duration: 0,
            key: nKey,
            btn: h('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5em',
                },
            }, [
                h(Button, {
                    onClick: () => {
                        notification.close(nKey);
                    },
                }, detector_ui_i18n[lang].cancelButtonText),
                h(Button, {
                    type: 'primary',
                    onClick: async () => {
                        currentLanguage.value = lang;
                        await db.put('kv', true, 'ui.languagePromptShown');
                        if (!await isFunctionalCookieConsented()) {
                            message.warning("You've disabled the functional cookies. The language settings will not be persisted.");
                            notification.close(nKey);
                            return;
                        }
                        // show loading dialog
                        const dlg = document.body.appendChild(document.createElement('dialog'));
                        dlg.append('Loading...');
                        dlg.showModal();
                        // reload to apply language change
                        await new Promise(r => setTimeout(r, 500));
                        window.location.reload();
                    },
                }, detector_ui_i18n[lang].confirmButtonText),
            ]),
            icon: h(QuestionCircleOutlined, { style: { color: 'var(--color-primary, #1890ff)' } }),
        });
        return true;
    }
    return null;
}

const detector_ui_i18n: any = {
    'en': {
        title: 'Change Display Language',
        text: "Do you want to change display language to English?",
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
    },
    'zh-CN': {
        title: '更改显示语言',
        text: "是否将显示语言更改为简体中文？",
        confirmButtonText: '是',
        cancelButtonText: '否',
    },
}

