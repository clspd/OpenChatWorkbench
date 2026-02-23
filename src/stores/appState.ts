// appStateStore: There are temporary datas which stores in the memory and losts when the page is reloaded.

import { ref, computed, type Component } from 'vue'
import { defineStore } from 'pinia'

export const useAppStateStore = defineStore('AppState', {
    state: () => ({
        page: 'unknown' as any,
        title: '',
        titleCustomize: false,
        titleNoTranslate: false,
        showCookieConsent: false,
        currentConversationId_: '' as string | null,
        mainContentViewEl: null as Component | null,
        showConfigGuide: false,
        userBlobContentUrlCache: new Map<string, string>(),
    }),
    getters: {
        currentConversationId: (state) => state.page === 'chat' ? state.currentConversationId_ : null,
    },
    actions: {
        setPage(page: any) {
            this.page = page
        },
        setTitle(title: string, customize: boolean = false, noTranslate: boolean = false) {
            this.titleCustomize = customize
            this.titleNoTranslate = noTranslate
            this.title = title
        },
    },
})
