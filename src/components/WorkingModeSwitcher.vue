<template>
    <DialogView v-model="open" class="a" :closable="!disableOperation">
        <template #title>{{ t('settings:working_mode.title') }}</template>
        <div class="pagetitle">{{ t('settings:working_mode.ptitle.c_' + currentMode) }}</div>
        <a-card v-if="!confirming" class="c" :title="t('settings:working_mode.std.title')" :data-iscurrent="currentMode === 'standard'">
            <div class="desc">{{ t('settings:working_mode.std.desc') }}</div>
            <div class="def">
                <a-radio :checked="defaultMode === 'standard'" @update:checked="defaultMode = 'standard'">{{ t('settings:working_mode.makeDefault') }}</a-radio>
            </div>
            <div class="set">
                <a-button v-if="currentMode !== 'standard'" autofocus type="primary" @click="requestSetMode('standard')">{{ t('settings:working_mode.switch.to') }}</a-button>
                <div v-else class="already">{{ t('settings:working_mode.switch.already') }}</div>
            </div>
        </a-card>
        <a-card v-if="!confirming" class="c" :title="t('settings:working_mode.iso.title')" :data-iscurrent="currentMode === 'isolated'">
            <div class="desc">{{ t('settings:working_mode.iso.desc') }}</div>
            <div class="def">
                <a-radio :checked="defaultMode === 'isolated'" @update:checked="defaultMode = 'isolated'">{{ t('settings:working_mode.makeDefault') }}</a-radio>
            </div>
            <div class="set">
                <a-button v-if="currentMode !== 'isolated'" autofocus type="primary" @click="requestSetMode('isolated')">{{ t('settings:working_mode.switch.to') }}</a-button>
                <div v-else class="already">{{ t('settings:working_mode.switch.already') }}</div>
            </div>
        </a-card>
        <div class="confirmation" v-if="confirming">
            <div class="confirm-text">{{ canSwitch ? t('settings:working_mode.switch.confirm', { mode: t('settings:working_mode.i.' + wantSwitch) }) : t('settings:working_mode.switch.blockedDueToActiveReq') }}</div>
            <div class="confirm-buttons">
                <a-button v-if="canSwitch" :disabled="disableOperation" type="primary" @click="wantSwitch && setMode(wantSwitch)" autofocus>{{ t('settings:working_mode.switch.switchNow') }}</a-button>
                <a-button :disabled="disableOperation" @click="confirming = false">{{ canSwitch ? t('common:ui.dialog.cancel') : t('settings:working_mode.switch.tryLater') }}</a-button>
            </div>
        </div>
    </DialogView>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue';
import { DialogView } from 'vue-dialog-view';
import { db } from '@/userdata';
import { useConversationStore } from '@/stores/conversationStore';
import { ForceDiscardCache } from '@/utils/cacheUtil';

const props = defineProps<{
    open: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:open', v: boolean): void;
}>();

const open = computed({
    get: () => props.open,
    set: v => (emit('update:open', v), confirming.value = false),
});

const conversationStore = useConversationStore();

type Mode = 'standard' | 'isolated';
const defaultMode = ref<Mode>('standard');
const currentMode = ref<Mode>(window.crossOriginIsolated ? 'isolated' : 'standard');

onMounted(async () => {
    const defIsol = await db.get('kv', 'app.world.security.isolate') === true;
    if (defIsol) defaultMode.value = 'isolated';

    watch(() => defaultMode.value, v => setDefault(v));
});

const confirming = ref(false), disableOperation = ref(false);
const wantSwitch = ref<Mode>();
const canSwitch = computed(() => conversationStore.requestsInProgress.size === 0);

async function setDefault(newVal: Mode) {
    const b = newVal === 'isolated' ? true : false
    setMode(newVal, true, false);
}

function requestSetMode(mode: Mode) {
    wantSwitch.value = mode;
    confirming.value = true;
}

// because of the cache policy, trying to set once is almost impossible
// so we just set it entirely
async function setMode(mode: Mode, persist = true, reload = true) {
    const b = mode === 'isolated' ? true : false
    document.cookie = `sys.security.isolateOrigin=${b}; Path=/;${persist ? (b ? ' Max-Age=31536000;' : ' Max-Age=0;') : ''} SameSite=Lax; Secure`;
    if (persist) await db.put('kv', b, 'app.world.security.isolate');
    // ensure changes to be applied
    if (reload) disableOperation.value = true;
    try {
        await ForceDiscardCache();
    } catch (e) {
        console.error('[WorkingModeSwitcher]', 'Unable to flush cache:', e);
    }
    if (reload) location.reload();
}


</script>

<style scoped>
.a {
    max-width: min(calc(100% - 2em), 600px);
}
.pagetitle {
    font-size: large;
    margin-bottom: 1em;
    text-align: center;
}
.c+.c {
    margin-top: 1em;
}
.set {
    margin-top: 0.5em;
}
.already {
    font-weight: bold;
}
.confirmation {
    display: flex;
    flex-direction: column;
    text-align: center;
}
.confirm-text {
    font-weight: bold;
    margin-bottom: 0.5em;
    max-width: 300px;
}
.confirm-buttons {
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
    justify-content: center;
}
</style>

<style scoped>
.def { display: none !important }
</style>
