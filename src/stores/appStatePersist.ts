// appStatePersistStore: These datas are **persistent** data which stores the user's preferences.

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { fs } from '@/userdata'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent'
import type { MessageFeatureItem } from '@/types/message'

export const useAppStatePersistStore = defineStore('AppStatePersist', {
    state: () => ({
        modelChooserScrollPos: 0,
        sidebarCollapsed: false,
        sidebarActiveTab: 'chat' as 'chat' | 'workspace',
        userSendMsgDefaultFeatures: [] as MessageFeatureItem[],
    }),
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
                    await fs.writeFile('data/config/appStatePersist.json', json)
                } catch (error) {
                    console.error('[AppStatePersist]', "Error saving appStatePersist: " + error);
                }
            })
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
