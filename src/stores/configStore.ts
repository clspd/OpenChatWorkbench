import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ModelConfig, ProviderConfig } from '@/types'
import { db } from '@/userdata'

export const useConfigStore = defineStore('config', {
    state: () => ({
        providers: [] as ProviderConfig[],
        models: [] as ModelConfig[],
        selectedModelId: '',
        selectedProviderId: '',
        favoriteModels: [] as [string, string][],
        modelChooser_showFavoritesOnly: false,
    }),
    actions: {
        initAutoSave() {
            this.$subscribe(async (mutation, state) => {
                try {
                    const data = JSON.parse(JSON.stringify(state))
                    for (const key in data) {
                        await db.put('config', data[key], key)
                    }
                } catch (error) {
                    //Log error
                }
            })
        },
        async loadConfig() {
            try {
                // enum idb
                const keys = await db.getAllKeys('config')
                for (const key of keys) {
                    const value = await db.get('config', key)
                    if (value) {
                        // @ts-ignore
                        this[key] = value
                    }
                }
            } catch (error) {
                //Log error
                console.error('[configStore]', 'Unable to load config', error)
            }
        },
        addProvider(provider: ProviderConfig) {
            this.providers.push(provider)
        },
        updateProvider(id: string, provider: ProviderConfig) {
            const index = this.providers.findIndex(p => p.id === id)
            if (index !== -1) {
                this.providers[index] = provider
            }
        },
        deleteProvider(id: string) {
            const index = this.providers.findIndex(p => p.id === id)
            if (index !== -1) {
                this.providers.splice(index, 1)
            }
        },
        getProviderById(id: string) {
            return this.providers.find(p => p.id === id)
        },
        addModel(model: ModelConfig) {
            this.models.push(model)
        },
        updateModel(id: string, model: ModelConfig) {
            const index = this.models.findIndex(m => m.id === id)
            if (index !== -1) {
                this.models[index] = model
            }
        },
        deleteModel(id: string) {
            const index = this.models.findIndex(m => m.id === id)
            if (index !== -1) {
                this.models.splice(index, 1)
            }
        },
        getModelById(id: string) {
            return this.models.find(m => m.id === id)
        },
        toggleFavoriteModel(providerId: string, modelId: string) {
            const index = this.favoriteModels.findIndex(([pid, mid]) => pid === providerId && mid === modelId)
            if (index === -1) {
                this.favoriteModels.push([providerId, modelId])
            } else {
                this.favoriteModels.splice(index, 1)
            }
        },
        isFavoriteModel(providerId: string, modelId: string) {
            return this.favoriteModels.some(([pid, mid]) => pid === providerId && mid === modelId)
        }
    },
})