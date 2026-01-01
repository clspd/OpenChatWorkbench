import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAppStateStore = defineStore('AppState', {
    state: () => ({
        page: 'unknown' as any,
        sidebarCollapsed: false,
    }),
    actions: {
        setPage(page: any) {
            this.page = page
        },
        setSidebarCollapsed(collapsed: boolean) {
            this.sidebarCollapsed = collapsed
        },
    },
})
