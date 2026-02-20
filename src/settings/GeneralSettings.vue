<template>
    <div class="sub-settings-container">
        <h2>General Settings</h2>

        <a-card title="Chat">
            <fieldset>
                <legend>Send Message with...</legend>
                <a-radio-group v-model:value="appStatePersist.sendMessageWithCtrlEnter" size="small">
                    <a-radio :value="false">Enter</a-radio>
                    <a-radio :value="true">Ctrl + Enter</a-radio>
                </a-radio-group>
            </fieldset>
        </a-card>
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { useAppStatePersistStore } from '@/stores/appStatePersist'
import { onMounted } from 'vue';

const appStatePersist = useAppStatePersistStore()

onMounted(() => {
    useAppStateStore().setTitle('General Settings')
})

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
