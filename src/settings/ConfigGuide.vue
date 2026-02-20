<template>
    <DialogView v-model="appState.showConfigGuide" class="config-guide">
        <template #title>Configuration</template>
        <a-steps v-model:current="current" :items="steps" />
        <div class="content">
            <div v-if="current === 0">
                <h2>Welcome to the configuration guide</h2>
                <p>This guide will help you configure the OpenChatWorkbench application.</p>
                <a-button type="primary" @click="current = 1">Let's Start</a-button>
            </div>
            <div v-if="current === 1">
                <h2>Provider</h2>
                <div><a href="javascript:" @click="--current">&lt;-- Previous</a>&nbsp;&nbsp;<a href="javascript:" @click="++current">Next --&gt;</a></div>
                <p>First of all, you need to add a new provider. A provider is a service that provides the API to connect to LLM.</p>
                <p>To edit or remove a provider, please turn to <router-link to="/settings/providers" @click="appState.showConfigGuide = false">Advanced Settings</router-link>.</p>
                <div><b>Who provides you with the service?</b><br><span>We've loaded a common provider list. If you don't see the provider you want, please add it manually.</span></div>
                <p><select v-model="selectedPresetProviderIdx" @change="handleUserSelectProvider" placeholder="Select a provider">
                    <option v-for="(it, idx) in providers" :key="idx" :value="String(idx)" :disabled="it.disabled">{{ it.name }} ({{ it.description }})</option>
                </select></p>
                <form class="provider-cfg-form" method="dialog" @submit.prevent>
                    <label>
                        <span>Provider name:&nbsp;</span>
                        <a-input required v-model:value="userCfg.name" placeholder="Please input" autocomplete="nickname" />
                    </label>
                    <label>
                        <span>API Key:&nbsp;</span>
                        <a-input required v-model:value="userCfg.key" placeholder="Please input" type="password" autocomplete="current-password" />
                    </label>
                    <label>
                        <span>Base URL:&nbsp;</span>
                        <a-input required v-model:value="userCfg.base" placeholder="Please input" type="url" autocomplete="url" />
                    </label>
                    <label>
                        <span>Request path:&nbsp;</span>
                        <a-input required v-model:value="userCfg.path" placeholder="Please input" autocomplete="off" />
                    </label>
                    <a-button type="primary" @click="saveProvider" :disabled="
                    !userCfg.base || !userCfg.key || !userCfg.name || !userCfg.path
                    ">Save</a-button>
                </form>
            </div>
            <div v-if="current === 2">
                <h2>Model</h2>
                <div><a href="javascript:" @click="--current">&lt;-- Previous</a>&nbsp;&nbsp;<a href="javascript:" @click="++current">Next --&gt;</a></div>
                <p>Now you can fetch models or add a model manually.</p>
                <p>Provider: {{ userProviderId || "N/A" }}</p>
                <a-button type="primary" @click="fetchModels" :disabled="!userProviderId">Fetch models (automatically)</a-button>
                <div style="display: flex; gap: 0.5em; margin-top: 0.5em;">
                    <a-input v-model:value="userInputModelId" :disabled="!userProviderId" />
                    <a-button @click="addModel" :disabled="!userProviderId || !userInputModelId">Add model by ID (manually)</a-button>
                </div>
                <div style="margin-top: 1em;">{{ modelAddResult }}</div>
            </div>
            <div v-if="current === 3">
                <h2>You're All Set</h2>
                <p>Enjoy the application :D</p>
                <a-button type="primary" @click="appState.showConfigGuide = false;">Done</a-button>
            </div>
        </div>
    </DialogView>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppStateStore } from '@/stores/appState';
import { useConfigStore } from '@/stores/configStore';
import { DialogView } from 'vue-dialog-view';

const appState = useAppStateStore()
const configStore = useConfigStore()
const current = ref(0)
const steps = ref([
    {
        title: 'Welcome',
        description: 'Welcome to the configuration guide',
    },
    {
        title: 'Provider',
        description: 'Add a new provider',
    },
    {
        title: 'Model',
        description: 'Fetch or add model list',
    },
    {
        title: 'Done',
        description: "You're all done",
    },
])

const selectedPresetProviderIdx = ref('')
const providers = ref<any>([])
const userCfg = ref({
    name: "",
    key: "",
    base: "",
    path: "",
});
const userProviderId = ref("");
const userInputModelId = ref("");

onMounted(() => {
    fetch('/assets/providers.json')
        .then(res => res.json())
        .then(json => providers.value = json)
        .catch(err => providers.value = [{
            name: 'Unable to load provider list, please add it manually; error: ' + err,
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
    });
    ++current.value;
    userCfg.value = {
        name: "",
        key: "",
        base: "",
        path: "",
    };
}

const modelAddResult = ref("")

const fetchModels = async () => {
    if (!userProviderId.value) return;
    modelAddResult.value = "Fetching in progress, please wait......"
    try {
        const provider = configStore.getProviderById(userProviderId.value);
        if (!provider) throw "Provider does not exist";
        const url = (`${provider.baseURL}/models`).replace(/\/\/models/g, '/models')
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${provider.api_key}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
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
            ++current.value;
        } else {
            modelAddResult.value = "Failed: Invalid response: " + JSON.stringify(data);
        }
    } catch (error) {
        modelAddResult.value = "Failed: " + error
    }
}

const addModel = () => {
    if (!userProviderId.value || !userInputModelId.value) return;
    try {
        configStore.addModel(userProviderId.value, userInputModelId.value, true);
        modelAddResult.value = "Successfully added " + userInputModelId.value;
        userInputModelId.value = '';
    }
    catch (e) {
        modelAddResult.value = "Failed: " + e;
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
