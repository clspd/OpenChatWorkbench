// configStore: There datas are **necessary** to run the application.
import { defineStore } from 'pinia'
import type { ModelConfig, ProviderConfig } from '@/types/config'
import { db } from '@/userdata'
import { isNecessaryCookieConsented } from '@/utils/cookieConsent'
import { debounce } from 'lodash-es'

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
            this.$subscribe(debounce(async (mutation, state) => {
                if (!await isNecessaryCookieConsented()) return;
                try {
                    const data = JSON.parse(JSON.stringify(state))
                    for (const key in data) {
                        await db.put('config', data[key], key)
                    }
                } catch (error) {
                    console.error('[configStore]', 'Unable to save config:' + error)
                }
            }, 500));
        },
        async loadConfig() {
            if (!await isNecessaryCookieConsented()) return;
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
                console.error('[configStore]', 'Unable to load config:' + error)
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
        addModel(provider_id: string, id: string, enabled: boolean) {
            const exists = this.models.some(m => m.provider_id === provider_id && m.id === id)
            if (exists) throw new Error("Model already exists for this provider")
            this.models.push({ provider_id, id, enabled })
        },
        updateModel(provider_id: string, id: string, updates: Partial<ModelConfig>) {
            const index = this.models.findIndex(m => m.provider_id === provider_id && m.id === id)
            if (index === -1) throw new Error("Model not found for this provider")
            Object.assign(this.models[index]!, updates); // modifys in place
        },
        deleteModel(provider_id: string, id: string) {
            const index = this.models.findIndex(m => m.provider_id === provider_id && m.id === id)
            if (index === -1) throw new Error("Model not found for this provider")
            this.models.splice(index, 1)
        },
        getModel(provider_id: string, id: string) {
            return this.models.find(m => m.provider_id === provider_id && m.id === id)
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
        },
        hasZombieModels() {
            return this.models.some(m => !this.providers.some(p => p.id === m.provider_id))
        },
        cleanupZombieModels() {
            const beforeCleanup = this.models.length
            this.models = this.models.filter(m => this.providers.some(p => p.id === m.provider_id))
            return beforeCleanup - this.models.length
        },
    },
})