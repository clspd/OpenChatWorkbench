<template>
    <div class="sub-settings-container">
        <h2>General Settings</h2>

        <a-alert v-if="!isAvailable" message="Warning: You've disabled the functional cookies. These settings will not be saved persistently." type="warning" show-icon />


        <a-card title="Chat">
            <fieldset>
                <legend>Send Message with...</legend>
                <a-radio-group v-model:value="appStatePersist.sendMessageWithCtrlEnter" size="small">
                    <a-radio :value="false">Enter</a-radio>
                    <a-radio :value="true">Ctrl + Enter</a-radio>
                </a-radio-group>
            </fieldset>
        </a-card>

        <a-card title="Accessibility">
            <a-alert message="Some settings may require a refresh to take effect completely." type="warning" show-icon closable />

            <fieldset @input="accessibilityNeedsRefresh = true">
                <legend>Font Size</legend>
                <a-slider v-model:value="appStatePersist.fontSizeGlobal" :min="10" :max="30" />
                <div style="display: flex; align-items: center; gap: 0.5em;">
                    <a-input-number v-model:value="appStatePersist.fontSizeGlobal" :min="1" :max="64" />
                    <a-button @click="appStatePersist.fontSizeGlobal = 14">Reset</a-button>
                </div>
            </fieldset>
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppStateStore } from '@/stores/appState';
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent';

const appStatePersist = useAppStatePersistStore()

const isAvailable = ref(true)

onMounted(() => {
    useAppStateStore().setTitle('General Settings');
    isFunctionalCookieConsented().then(c => isAvailable.value = c);
});

const accessibilityNeedsRefresh = ref(false)

</script>

<style scoped>
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

h2, p {
    margin-top: 0;
}

fieldset {
    border-style: solid;
    border-width: 1px;
    border-color: #ccc;
}
</style>
