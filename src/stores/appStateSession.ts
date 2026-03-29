// appStateSessionStore: These datas are **session** functionl data which stores the user's preferences.

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { app_name_id } from '@/config'
import type { ChatEditBuffer } from '@/types/conversation'
import { db } from '@/userdata'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent'
import { debounce } from 'lodash-es'

export const useAppStateSessionStore = defineStore('AppStateSession', {
    state: () => ({
        conversationListScrollPos: 0,
        chatEditBuffer: new Object() as ChatEditBuffer,
    }),
    actions: {
        initAutoSave() {
            this.$subscribe(debounce(async (mutation, state) => {
                if (!await isFunctionalCookieConsented()) return;
                try {
                    const json = JSON.parse(JSON.stringify(state))
                    let windowId = window.sessionStorage.getItem(app_name_id + '@windowId')
                    if (!windowId) windowId = this.createWindowId()
                    // window.sessionStorage.setItem(app_name_id + '@appStateSession', json)
                    await db.put('kv', json, 'sessionState_' + windowId)
                } catch (error) {
                    console.error('[AppStateSession]', "Error saving appStateSession: " + error);
                }
            }, 200));
        },
        createWindowId() {
            const windowId = window.crypto.randomUUID()
            window.sessionStorage.setItem(app_name_id + '@windowId', windowId)
            return windowId
        },
        async load() {
            if (!await isFunctionalCookieConsented()) return;
            try {
                // const json = window.sessionStorage.getItem(app_name_id + '@appStateSession')
                let windowId = window.sessionStorage.getItem(app_name_id + '@windowId')
                if (!windowId) return;
                const json = await db.get('kv', 'sessionState_' + windowId)
                if (!json) return;
                const state = JSON.parse(JSON.stringify(json))
                this.$patch(state)
            } catch (error) {
                console.error('[AppStateSession]', "Error loading appStateSession: " + error);
            }
        },
        async cleanup() {
            const allKeys = await db.getAllKeys('kv')
            const currentWindowId = window.sessionStorage.getItem(app_name_id + '@windowId') ?? this.createWindowId()
            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith('sessionState_') && key !== ('sessionState_' + currentWindowId)) {
                    await db.delete('kv', key)
                }
            }
        },
    },
})
