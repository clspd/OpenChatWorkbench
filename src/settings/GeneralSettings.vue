<template>
    <div class="sub-settings-container">
        <h2>{{ t('settings:general.title') }}</h2>

        <a-alert v-if="!isAvailable" message="Warning: You've disabled the functional cookies. These settings will not be saved persistently." type="warning" show-icon />

        <a-card :title="t('settings:general.language.title')">
            <a-select v-model:value="currentLanguage" style="width: 100%;">
                <a-select-option value="en">{{ t('settings:general.language.options.en') }}</a-select-option>
                <a-select-option value="zh-CN">{{ t('settings:general.language.options.zh-CN') }}</a-select-option>
            </a-select>
        </a-card>

        <a-card :title="t('settings:general.chat.title')">
            <fieldset>
                <legend>{{ t('settings:general.chat.legend') }}</legend>
                <a-radio-group v-model:value="appStatePersist.sendMessageWithCtrlEnter" size="small">
                    <a-radio :value="false">{{ t('settings:general.chat.options.enter') }}</a-radio>
                    <a-radio :value="true">{{ t('settings:general.chat.options.ctrl-enter') }}</a-radio>
                </a-radio-group>
            </fieldset>
        </a-card>

        <a-card :title="t('settings:general.accessibility.title')">
            <a-alert :message="t('settings:general.accessibility.alert')" type="warning" show-icon closable />

            <fieldset @input="accessibilityNeedsRefresh = true">
                <legend>{{ t('settings:general.accessibility.fontSize.legend') }}</legend>
                <a-slider v-model:value="appStatePersist.fontSizeGlobal" :min="10" :max="30" />
                <div style="display: flex; align-items: center; gap: 0.5em;">
                    <a-input-number v-model:value="appStatePersist.fontSizeGlobal" :min="1" :max="64" />
                    <a-button @click="appStatePersist.fontSizeGlobal = 14">{{ t('settings:general.accessibility.fontSize.reset') }}</a-button>
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
import { currentLanguage } from '@/i18n';

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
