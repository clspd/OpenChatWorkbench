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

        <a-card :title="t('settings:chat.attachmentOptions.title')">
            <fieldset>
                <legend>{{ t('settings:chat.attachmentOptions.throttleSingleFileSize.legend') }}</legend>
                <p>{{ t('settings:chat.attachmentOptions.throttleSingleFileSize.description') }}</p>
                <a-input-number 
                    v-model:value="appStatePersist.fileUploadThrottleSize" 
                    :min="1" 
                    :max="1024" 
                    :precision="0"
                />
                <span style="margin-left: 0.5em;">MiB</span>
            </fieldset>
        </a-card>

        <a-card :title="t('settings:chat.markdown.title')">
            <fieldset>
                <legend>{{ t('settings:chat.markdown.userSystemMessage.legend') }}</legend>
                <p style="margin-top: 0; color: var(--color-secondary, gray);">
                    {{ t('settings:chat.markdown.userSystemMessage.description') }}
                </p>
                <a-radio-group v-model:value="appStatePersist.userSystemMarkdownRenderMode" size="small">
                    <a-radio :value="'full'">{{ t('settings:chat.markdown.options.full') }}</a-radio>
                    <a-radio :value="'recommended'">{{ t('settings:chat.markdown.options.recommended') }}</a-radio>
                    <a-radio :value="'disabled'">{{ t('settings:chat.markdown.options.disabled') }}</a-radio>
                </a-radio-group>
            </fieldset>
            
            <fieldset>
                <legend>{{ t('settings:chat.markdown.assistantMessage.legend') }}</legend>
                <p style="margin-top: 0; color: var(--color-secondary, gray);">
                    {{ t('settings:chat.markdown.assistantMessage.description') }}
                </p>
                <a-radio-group v-model:value="appStatePersist.assistantMarkdownRenderMode" size="small">
                    <a-radio :value="'full'">{{ t('settings:chat.markdown.options.full') }}</a-radio>
                    <a-radio :value="'recommended'">{{ t('settings:chat.markdown.options.recommended') }}</a-radio>
                    <a-radio :value="'disabled'">{{ t('settings:chat.markdown.options.disabled') }}</a-radio>
                </a-radio-group>
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
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

h2, p {
    margin-top: 0;
}

fieldset {
    border: none;
    padding: 0;
    margin: 1em 0;

    &:first-child {
        margin-top: 0;
    }

    &:last-child {
        margin-bottom: 0;
    }
}

legend {
    padding: 0;
    margin-bottom: 0.5em;
    font-weight: bold;
}

a-radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
}
</style>
