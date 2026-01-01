import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useWindowStateStore = defineStore('WindowState', () => {
    const width = ref(0)
    const height = ref(0)
    const updateWindowSize = (w: number, h: number) => {
        width.value = w
        height.value = h
    }

    return { width, height, updateWindowSize }
})
