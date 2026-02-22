// appStatePersistStore: These datas are **persistent** data which stores the user's preferences.

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { fs } from '@/userdata'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent'
import type { MessageFeatureItem } from '@/types/message'
import type { Config as DomPurifyConfig } from 'dompurify'
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context'
import { app_name_id } from '@/config'
// import { debounce } from '@tanstack/vue-virtual'

// const notifyBrothers = debounce(window, () => window.localStorage.setItem(app_name_id + "@statePersistUpdated", "" + Math.random()), 100);

export const useAppStatePersistStore = defineStore('AppStatePersist', {
    state: () => ({
        language: 'en',
        fontSizeGlobal: 0,
        modelChooserScrollPos: 0,
        modelChooserSearchKeyword: '',
        sidebarCollapsed: false,
        sidebarActiveTab: 'chat' as 'chat' | 'workspace',
        userSendMsgDefaultFeatures: [] as MessageFeatureItem[],
        usePlainInput: false,
        sendMessageWithCtrlEnter: false,
        domPurifCfg: {
            FORBID_TAGS: ["style", "img"],
        } as DomPurifyConfig,
    }),
    getters: {
        theme: (state): ThemeConfig => ({
            token: {
                fontSize: state.fontSizeGlobal || 14,
            }
        }),
    },
    actions: {
        initAutoSave() {
            this.$subscribe(async (mutation, state) => {
                if (!await isFunctionalCookieConsented()) return;
                try {
                    const json = JSON.stringify(state)
                    // ensure the directory exists
                    if (!await fs.exists('data/config')) {
                        await fs.mkdir('data/config', { recursive: true })
                    }
                    await fs.writeFile('data/config/appStatePersist.json', json);
                    // notifyBrothers();
                } catch (error) {
                    console.error('[AppStatePersist]', "Error saving appStatePersist: " + error);
                }
            });
            // window.addEventListener('storage', ((e: StorageEvent) => {
            //     if (e.key === app_name_id + "@statePersistUpdated") {
            //         this.load().catch(e => {
            //             console.warn('[AppStatePersist]', "Failed to sync appStatePersist: " + e);
            //         });
            //     }
            // }));
        },
        async load() {
            if (!await isFunctionalCookieConsented()) return;
            if (!await fs.exists('data/config/appStatePersist.json')) return;
            try {
                const json = new TextDecoder().decode(await fs.readFile('data/config/appStatePersist.json'))
                const state = JSON.parse(json)
                this.$patch(state)
            } catch (error) {
                console.error('[AppStatePersist]', "Error loading appStatePersist: " + error);
            }
        },
    },
})
