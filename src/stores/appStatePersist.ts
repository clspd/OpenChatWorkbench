import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { fs } from '@/userdata'

export const useAppStatePersistStore = defineStore('AppStatePersist', {
    state: () => ({
        modelChooserScrollPos: 0,
    }),
    actions: {
        initAutoSave() {
            this.$subscribe(async (mutation, state) => {
                try {
                    const json = JSON.stringify(state)
                    // ensure the directory exists
                    if (!await fs.exists('/data/config')) {
                        await fs.mkdir('/data/config', { recursive: true })
                    }
                    await fs.writeFile('/data/config/appStatePersist.json', json)
                } catch (error) {
                    //Log error
                }
            })
        },
        async load() {
            try {
                const json = new TextDecoder().decode(await fs.readFile('/data/config/appStatePersist.json'))
                const state = JSON.parse(json)
                this.$patch(state)
            } catch (error) {
                //Log error
            }
        },
    },
})
