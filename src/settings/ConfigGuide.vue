<template>
    <DialogView v-model="appState.showConfigGuide" class="config-guide">
        <template #title>{{ t('configGuide:title') }}</template>
        <a-steps v-model:current="current" :items="steps" />
        <div class="content">
            <div v-if="current === 0">
                <h2>{{ t('configGuide:welcome.title') }}</h2>
                <p>{{ t('configGuide:welcome.description') }}</p>
                <a-button type="primary" @click="current = 1">{{ t('configGuide:welcome.startButton') }}</a-button>
            </div>
            <div v-if="current === 1">
                <h2>{{ t('configGuide:provider.title') }}</h2>
                <div><a href="javascript:" @click="--current">{{ t('configGuide:provider.previous') }}</a>&nbsp;&nbsp;<a href="javascript:" @click="++current">{{ t('configGuide:provider.next') }}</a></div>
                <p>{{ t('configGuide:provider.description') }}</p>
                <p>{{ t('configGuide:provider.advancedSettings') }} <router-link to="/settings/providers" @click="appState.showConfigGuide = false">Advanced Settings</router-link>.</p>
                <div><b>{{ t('configGuide:provider.question') }}</b><br><span>{{ t('configGuide:provider.hint') }}</span></div>
                <p style="overflow: auto; white-space: nowrap; border-bottom: 1px solid gray; padding-bottom: 1em;">{{ t('configGuide:provider.choose') }} <select v-model="selectedPresetProviderIdx" @change="handleUserSelectProvider" placeholder="Select a provider">
                    <option value="" disabled>{{ t('configGuide:provider.pleaseSelect') }}</option>
                    <option v-for="(it, idx) in providers" :key="idx" :value="String(idx)" :disabled="it.disabled">{{ it.icon }} {{ it.name }} ({{ it.description }})</option>
                </select></p>
                <form class="provider-cfg-form" method="dialog" @submit.prevent>
                    <label>
                        <span>{{ t('configGuide:provider.form.name') }}</span>
                        <a-input required v-model:value="userCfg.name" :placeholder="t('configGuide:provider.form.namePlaceholder')" autocomplete="nickname" />
                    </label>
                    <label>
                        <span>{{ t('configGuide:provider.form.apiKey') }}</span>
                        <a-input required v-model:value="userCfg.key" :placeholder="t('configGuide:provider.form.apiKeyPlaceholder')" type="password" autocomplete="current-password" />
                    </label>
                    <label>
                        <span>{{ t('configGuide:provider.form.baseURL') }}</span>
                        <a-input required v-model:value="userCfg.base" :placeholder="t('configGuide:provider.form.baseURLPlaceholder')" type="url" autocomplete="url" />
                    </label>
                    <label>
                        <span>{{ t('configGuide:provider.form.requestPath') }}</span>
                        <a-input required v-model:value="userCfg.path" :placeholder="t('configGuide:provider.form.requestPathPlaceholder')" autocomplete="off" />
                    </label>
                    <label>
                        <span>{{ t('configGuide:provider.form.compatibilityMode') }}</span>
                        <a-radio-group v-model:value="userCfg.compatibilityMode" style="display: flex; gap: 0.5em; flex-wrap: wrap; overflow-wrap: anywhere;">
                            <a-radio value="untested" disabled v-if="userCfg.compatibilityMode === 'untested'">{{ t('configGuide:provider.form.compatibilityModeUntested') }}</a-radio>
                            <template v-else>
                                <a-radio value="openai">{{ t('configGuide:provider.form.compatibilityModeOpenAI') }}</a-radio>
                                <a-radio value="claude">{{ t('configGuide:provider.form.compatibilityModeClaude') }}</a-radio>
                                <a-radio value="gemini">{{ t('configGuide:provider.form.compatibilityModeGemini') }}</a-radio>
                            </template>
                        </a-radio-group>
                    </label>
                    <a-button type="primary" @click="saveProvider" :disabled="
                    !userCfg.base || !userCfg.key || !userCfg.name || !userCfg.path
                    ">{{ t('configGuide:provider.form.save') }}</a-button>
                </form>
            </div>
            <div v-if="current === 2">
                <h2>{{ t('configGuide:model.title') }}</h2>
                <div><a href="javascript:" @click="--current">{{ t('configGuide:model.previous') }}</a>&nbsp;&nbsp;<a href="javascript:" @click="++current">{{ t('configGuide:model.next') }}</a></div>
                <p>{{ t('configGuide:model.description') }}</p>
                <p>{{ t('configGuide:model.provider') }} <select v-model="userProviderId" placeholder="Select a provider">
                    <option value="" disabled>{{ t('configGuide:model.pleaseSelect') }}</option>
                    <option v-for="(it, idx) in configStore.providers" :key="idx" :value="it.id">#{{ idx }} - {{ it.name }}</option>
                </select></p>
                <a-button type="primary" @click="fetchModels" :disabled="!userProviderId">{{ t('configGuide:model.fetchButton') }}</a-button>
                <div style="display: flex; gap: 0.5em; margin-top: 0.5em;">
                    <a-input v-model:value="userInputModelId" :disabled="!userProviderId" />
                    <a-button @click="addModel" :disabled="!userProviderId || !userInputModelId">{{ t('configGuide:model.addModelButton') }}</a-button>
                </div>
                <div style="margin-top: 1em;">{{ modelAddResult }}</div>
            </div>
            <div v-if="current === 3">
                <h2>{{ t('configGuide:done.title') }}</h2>
                <p>{{ t('configGuide:done.description') }}</p>
                <div style="margin-bottom: 1em;"><a href="javascript:" @click="--current">{{ t('configGuide:done.previous') }}</a></div>
                <a-button type="primary" @click="appState.showConfigGuide = false;">{{ t('configGuide:done.doneButton') }}</a-button>
            </div>
        </div>
    </DialogView>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useAppStateStore } from '@/stores/appState';
import { useConfigStore } from '@/stores/configStore';
import { DialogView } from 'vue-dialog-view';
import { t } from 'i18next';

const appState = useAppStateStore()
const configStore = useConfigStore()
const current = ref(0)

const steps = computed(() => [
    {
        title: t('configGuide:steps.welcome.title'),
        description: t('configGuide:steps.welcome.description'),
    },
    {
        title: t('configGuide:steps.provider.title'),
        description: t('configGuide:steps.provider.description'),
    },
    {
        title: t('configGuide:steps.model.title'),
        description: t('configGuide:steps.model.description'),
    },
    {
        title: t('configGuide:steps.done.title'),
        description: t('configGuide:steps.done.description'),
    },
])

const selectedPresetProviderIdx = ref('')
const providers = ref<any>([])
const userCfg = ref({
    name: "",
    key: "",
    base: "",
    path: "",
    compatibilityMode: "openai",
});
const userProviderId = ref("");
const userInputModelId = ref("");

onMounted(() => {
    fetch('/assets/providers.json')
        .then(res => res.json())
        .then(json => providers.value = json)
        .catch(err => providers.value = [{
            name: t('configGuide:errors.unableToLoadProviders', { error: err }),
        }])
})

const handleUserSelectProvider = async (e: Event) => {
    const data = providers.value[parseInt((e.target as HTMLSelectElement).value)];
    if (!data) return
    userCfg.value = {
        name: data.name,
        key: "",
        base: data.baseURL,
        path: data.requestPath,
        compatibilityMode: data.compatibilityMode || "openai",
    }
}

const saveProvider = () => {
    userProviderId.value = crypto.randomUUID();
    configStore.addProvider({
        id: userProviderId.value,
        name: userCfg.value.name,
        api_key: userCfg.value.key,
        baseURL: userCfg.value.base,
        requestPath: userCfg.value.path,
        enabled: true,
        compatibilityMode: userCfg.value.compatibilityMode,
    });
    ++current.value;
    userCfg.value = {
        name: "",
        key: "",
        base: "",
        path: "",
        compatibilityMode: "openai",
    }
}

const modelAddResult = ref("")

const fetchModels = async () => {
    if (!userProviderId.value) return;
    modelAddResult.value = t('configGuide:model.fetching')
    try {
        const provider = configStore.getProviderById(userProviderId.value);
        if (!provider) throw t('configGuide:model.providerNotFound');
        const url = (`${provider.baseURL}/models`).replace(/\/\/models/g, '/models')
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${provider.api_key}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(t('configGuide:model.httpError', { status: response.status, text: await response.text() }))
        }
        const data = await response.json()
        let err = 0;
        if (data.data && Array.isArray(data.data)) {
            for (const modelData of data.data) {
                const modelId = modelData.id || modelData.model
                try {
                    configStore.addModel(userProviderId.value, modelId, true);
                } catch {
                    ++err;
                }
            }
            console.log("[ConfigGuide]", "Found ", err, "errors");
            modelAddResult.value = t('configGuide:model.successAdded', { count: data.data.length - err, errors: err });
            ++current.value;
        } else {
            modelAddResult.value = t('configGuide:model.invalidResponse', { data: JSON.stringify(data) });
        }
    } catch (error) {
        modelAddResult.value = t('configGuide:model.failed', { error })
    }
}

const addModel = () => {
    if (!userProviderId.value || !userInputModelId.value) return;
    try {
        configStore.addModel(userProviderId.value, userInputModelId.value, true);
        modelAddResult.value = t('configGuide:model.successAddedModel', { modelId: userInputModelId.value });
        userInputModelId.value = '';
    }
    catch (e) {
        modelAddResult.value = t('configGuide:model.failed', { error: e });
    }
}

</script>

<style scoped>
.config-guide {
    width: 100%;
    height: 100%;
}

.provider-cfg-form {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}
</style>
