<template>
    <WebViewCore
        class="webview"
        :content="computedUrl.href"
        :disabled="disabled"
    />
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue';
import yn from 'yn';
import WebViewCore from '@/components/WebViewCore.vue';
import { domain_name_main_root, webview_trusted_domains } from '@/config';
import { Checkbox, Modal } from 'ant-design-vue';
import { t } from 'i18next';
import { db } from '@/userdata';
import { checkUrlIsExternal } from '@/utils/externalUrl';

const url = ref('');
const disabled = ref(true);
const computedUrl = computed(() => new URL(url.value));
const safeMode = !!yn((new URL(location.href)).searchParams.get('safe'));

const isExternal = computed(() => checkUrlIsExternal(computedUrl.value));

async function update() {
    try {
        const newUrl = new URL(decodeURIComponent(location.hash.substring(1)), location.href);
        Modal.destroyAll();
        if (!safeMode || !checkUrlIsExternal(newUrl)) disabled.value = false;
        else {
            if (await db.get('kv', 'ui.webview.security_prompt.dismiss') === true) {
                disabled.value = false;
            }
            else {
                disabled.value = true;
                const naa = ref(false);
                const user = await new Promise(r => Modal.confirm({
                    title: t('common:ui.webview.external.warning.title'),
                    content: h({
                        render: () => h('div', null, [
                            h('div', { style: { whiteSpace: 'pre-wrap' } }, t('common:ui.webview.external.warning.content')),
                            h('hr'),
                            h(Checkbox, {
                                checked: naa.value,
                                "onUpdate:checked": v => naa.value = v,
                            }, t('common:ui.webview.external.warning.noask'))
                        ])
                    }),
                    okText: t('common:ui.dialog.continue'),
                    cancelText: t('common:ui.dialog.cancel'),
                    onOk: () => r(true),
                    onCancel: () => r(false),
                }));
                if (!user) {
                    setTimeout(() => location.hash = '#/resource/blocked_due_to_security@1.0.0.html');
                }
                else {
                    if (naa.value) await db.put('kv', true, 'ui.webview.security_prompt.dismiss');
                    disabled.value = false;
                }
            }
        }
        url.value = newUrl.href;
    } catch (e) {
        console.warn('Invalid URL: ', location.hash, String(e));
    }
}

window.addEventListener('hashchange', update);
update();

</script>

<style scoped>
.webview {
    position: absolute;
    box-sizing: border-box;
    border: 0;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    inset: 0;
}
</style>