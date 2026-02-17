<template>
    <DialogView v-if="!isCookiesEnabled" :model-value="!isCookiesEnabled" :closable="false" style="width: 640px;">
        <template #title>Unable to access site</template>
        <div>This site uses a technology named <b>Cookies</b> to store your user data. You can disable unnecessary cookies, but if you disable <b>all</b> cookies, the basic functionality of the website will stop working because we could no longer know who you are.</div>
        <div>If you disable Cookies anyway, we will not be able to provide you with basic features of the website, such as chat, and other interactive features.</div>
        <hr style="width: 100%; box-sizing: border-box;">
        <div>If you've changed idea, please click the button below to refresh the page and try again.</div>
        <template #footer>
            <div style="text-align: right;">
                <a-button type="primary" @click="reloadPage">Refresh Page</a-button>
            </div>
        </template>
    </DialogView>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DialogView } from 'vue-dialog-view'

const isCookiesEnabled = ref(true)

onMounted(() => {
    try { isCookiesEnabled.value = document.cookie.includes('sys.cookies.enabled=true') }
    catch { isCookiesEnabled.value = false } // if cookies is disabled, accessing document.cookie will throw an error
})

function reloadPage() {
    window.location.reload()
}
</script>

