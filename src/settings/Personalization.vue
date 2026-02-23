<template>
    <div class="sub-settings-container">
        <h2>{{ t('settings:personalization.title') }}</h2>

        <a-alert v-if="!isAvailable" message="Warning: You've disabled the functional cookies. These settings will not be saved persistently." type="warning" show-icon />

        <a-card :title="t('settings:personalization.showAvatar.title')">
            <p>{{ t('settings:personalization.showAvatar.description') }}</p>
            <a-radio-group v-model:value="appStatePersist.showAvatar" size="small">
                <a-radio value="default">{{ t('settings:personalization.showAvatar.state.default') }}</a-radio>
                <a-radio value="custom">{{ t('settings:personalization.showAvatar.state.custom') }}</a-radio>
                <a-radio value="off">{{ t('settings:personalization.showAvatar.state.off') }}</a-radio>
            </a-radio-group>
            <div v-if="appStatePersist.showAvatar === 'custom'" style="margin-top: 1em;">
                <p>{{ t('settings:personalization.showAvatar.custom.description') }}</p>
                <p>{{ t('settings:personalization.showAvatar.custom.roles.user') }}: <input type="file" autocomplete="off" accept="image/*" @change="e => changeAvatar('user', e)" /> <input type="button" value="Reset" @click="resetAvatar('user')" /></p>
                <p>{{ t('settings:personalization.showAvatar.custom.roles.assistant') }}: <input type="file" autocomplete="off" accept="image/*" @change="e => changeAvatar('assistant', e)" /> <input type="button" value="Reset" @click="resetAvatar('assistant')" /></p>
                <p>{{ t('settings:personalization.showAvatar.custom.roles.system') }}: <input type="file" autocomplete="off" accept="image/*" @change="e => changeAvatar('system', e)" /> <input type="button" value="Reset" @click="resetAvatar('system')" /></p>
            </div>
        </a-card>
        
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { t } from 'i18next';
import { useAppStateStore } from '@/stores/appState';
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { isFunctionalCookieConsented } from '@/utils/cookieConsent';
import { fs } from '@/userdata';
import { chatPersonalizationDataBasePath } from '@/modules/chat/path';
import { clearAvatarCache } from '@/utils/userCustomAvatar';

const appStatePersist = useAppStatePersistStore()

const isAvailable = ref(true)

onMounted(() => {
    useAppStateStore().setTitle('Personalization Settings');
    isFunctionalCookieConsented().then(c => isAvailable.value = c);
});

const changeAvatar = async (role: 'user' | 'assistant' | 'system', e: Event) => {
    const target = e.target as HTMLInputElement
    if (!target || !target.files || target.files.length === 0) return;
    const file = target.files[0]
    if (!file) return;
    try {
        clearAvatarCache();
        await fs.writeFile(chatPersonalizationDataBasePath + "useravatar_" + role, new Uint8Array(await file.arrayBuffer()));
        target.value = '';
        message.success(t('settings:personalization.showAvatar.feedback.success'));
    }
    catch (e) {
        message.error(t('settings:personalization.showAvatar.feedback.error', { e }));
    }
}

const resetAvatar = (role: 'user' | 'assistant' | 'system') => {
    fs.unlink(chatPersonalizationDataBasePath + "useravatar_" + role).then(() => clearAvatarCache()).then(() => {
        message.success(t('settings:personalization.showAvatar.feedback.success_reset'));
    }).catch((e) => {
        if (e && (e as any).code === 'ENOENT') {
            message.success(t('settings:personalization.showAvatar.feedback.success_reset'));
        }
        else {
            message.error(t('settings:personalization.showAvatar.feedback.error', { e }));
        }
    });
}



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
