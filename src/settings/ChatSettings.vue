<template>
    <div class="sub-settings-container">
        <h2>{{ t('settings:chat.title') }}</h2>

        <a-alert v-if="!isAvailable" message="Warning: You've disabled the functional cookies. These settings will not be saved persistently." type="warning" show-icon />

        <a-card :title="t('settings:chat.sendMessage.title')">
            <fieldset>
                <legend>{{ t('settings:chat.sendMessage.sendMsgWith.legend') }}</legend>
                <a-radio-group v-model:value="appStatePersist.sendMessageWithCtrlEnter" size="small">
                    <a-radio :value="false">{{ t('settings:chat.sendMessage.sendMsgWith.options.enter') }}</a-radio>
                    <a-radio :value="true">{{ t('settings:chat.sendMessage.sendMsgWith.options.ctrl-enter') }}</a-radio>
                </a-radio-group>
            </fieldset>
        </a-card>

        <a-card :title="t('settings:chat.markdown.title')">
            <fieldset>
                <legend>{{ t('settings:chat.markdown.rendering.legend') }}</legend>
                <a-checkbox v-model:checked="appStatePersist.renderMarkdown">
                    {{ t('settings:chat.markdown.rendering.enable') }}
                </a-checkbox>
                <div style="margin-top: 0.5em; color: var(--color-secondary, gray);">
                    {{ t('settings:chat.markdown.rendering.description') }}
                </div>
            </fieldset>
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { t } from 'i18next';
import { useAppStateStore } from '@/stores/appState';
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent';

const appStatePersist = useAppStatePersistStore()

const isAvailable = ref(true)

onMounted(() => {
    useAppStateStore().setTitle('Chat Settings');
    isFunctionalCookieConsented().then(c => isAvailable.value = c);
});
</script>

<style scoped>
fieldset {
    border: none;
    padding: 0;
    margin: 1em 0;
}

legend {
    padding: 0;
    margin-bottom: 0.5em;
    font-weight: bold;
}
</style>
