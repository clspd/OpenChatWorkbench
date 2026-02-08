import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStateStore = defineStore('AppState', {
    state: () => ({
        page: 'unknown' as any,
        title: '',
        titleCustomize: false,
    }),
    actions: {
        setPage(page: any) {
            this.page = page
        },
        setTitle(title: string, customize: boolean = false) {
            this.titleCustomize = customize
            this.title = title
        },
    },
})
