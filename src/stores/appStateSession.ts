import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { app_name_id } from '@/config'
import type { ChatEditBuffer } from '@/types'
import { db } from '@/userdata'
import { IsFirstInstance } from '@/utils/appInstanceDetector'

export const useAppStateSessionStore = defineStore('AppStateSession', {
    state: () => ({
        conversationListScrollPos: 0,
        chatEditBuffer: new Object() as ChatEditBuffer,
    }),
    actions: {
        initAutoSave() {
            this.$subscribe(async (mutation, state) => {
                try {
                    const json = JSON.stringify(state)
                    let windowId = window.sessionStorage.getItem(app_name_id + '@windowId')
                    if (!windowId) {
                        windowId = window.crypto.randomUUID()
                        window.sessionStorage.setItem(app_name_id + '@windowId', windowId)
                    }
                    // window.sessionStorage.setItem(app_name_id + '@appStateSession', json)
                    await db.put('kv', json, 'sessionState_' + windowId)
                } catch (error) {
                    //Log error
                    // console.error('Error saving appStateSession to sessionStorage:', error)
                }
            })
        },
        async load() {
            try {
                // const json = window.sessionStorage.getItem(app_name_id + '@appStateSession')
                let windowId = window.sessionStorage.getItem(app_name_id + '@windowId')
                if (!windowId) return
                const json = await db.get('kv', 'sessionState_' + windowId)
                if (!json) {
                    return
                }
                const state = JSON.parse(json)
                this.$patch(state)
            } catch (error) {
                //Log error
                // console.error('Error loading appStateSession from sessionStorage:', error)
            }
        },
        async cleanup() {
            const isFirstInstance = await IsFirstInstance(5000) && await IsFirstInstance(1000)
            console.log('[appStateSession] [cleanup] isFirstInstance=', isFirstInstance)
            if (!isFirstInstance) return
            const allKeys = await db.getAllKeys('kv')
            const currentWindowId = window.sessionStorage.getItem(app_name_id + '@windowId')
            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith('sessionState_') && key !== ('sessionState_' + currentWindowId)) {
                    await db.delete('kv', key)
                }
            }
        },
    },
})
