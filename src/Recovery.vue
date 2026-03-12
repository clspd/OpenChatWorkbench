<template>
    <ConfigProvider :theme="{algorithm: theme.darkAlgorithm}">
        <div class="recovery-app" @keydown.capture="e => (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toUpperCase() === 'L') && (messages.length = 0, e.preventDefault())">
            <h1>Recovery</h1>

            <hr>

            <div class="console-messages" ref="messageContainer">
                <div class="quick-operations">
                    <b>Quick Operations</b>
                    <span>:&nbsp;</span>
                    <a href="javascript:" @click="messages.length = 0">Clear console (Ctrl+L)</a>
                    <span class="sep">|</span>
                    <a href="javascript:" @click="clearTable('config')">Clear config table</a>
                    <span class="sep">|</span>
                    <a href="javascript:" @click="clearTable('kv')">Clear kv table</a>
                    <span class="sep">|</span>
                    <a href="javascript:" @click="clearCache">Clear cache</a>
                    <span class="sep">|</span>
                    <a href="javascript:" @click="unregSw">Unregister Service Workers</a>
                    <span class="sep">|</span>
                    <a href="javascript:" @click="goBack">Go back to main application</a>
                </div>

                <div v-for="(it, idx) in messages" :key="idx" class="message">
                    {{ it }}
                </div>
            </div>

            <div class="cmd-input">
                <a-textarea :disabled="isRunning" class="cmd" v-model:value="usercmd" placeholder="Type &quot;help&quot; to get help"></a-textarea>
                <a-button :disabled="isRunning || !usercmd" @click="runCommand" style="height: auto">Execut{{ isRunning ? "ing…" : "e" }}</a-button>
            </div>
        </div>
    </ConfigProvider>
</template>

<script setup lang="ts">
import { Modal, ConfigProvider, theme, Checkbox } from 'ant-design-vue';
import { h, nextTick, ref, type VNode } from 'vue';
import { db, fs } from './userdata';
import { TraceErrorAndGetString } from './utils/errorTrace';

const confirm = (text: string | VNode, title = 'Confirm', yes = 'Yes', no = 'No') => new Promise(r => Modal.confirm({
    title, content: text,
    okText: yes,
    cancelText: no,
    onOk: () => r(true),
    onCancel: () => r(false),
}));

const usercmd = ref('');
const messageContainer = ref<HTMLDivElement>();

// ------
// Quick operations

const clearTable = async (n: string) => {
    if (!await confirm('Are you sure?? This will delete ALL data in "' + n + '"!')) return;
    usercmd.value = "return await db.clear('" + n + "');";
}
const clearCache = () => usercmd.value = 'return await caches.delete(appInitConfig.CACHE_PREFIX + appInitConfig.CACHE_VERSION)';
const unregSw = () => usercmd.value = 'await Promise.all((await window.navigator.serviceWorker.getRegistrations()).map((reg) => reg.unregister()))';
const goBack = () => usercmd.value = 'location.href = "/"';

// ------
// Code execution
const isRunning = ref(false);
const messages = ref<string[]>([]);
const runCommand = async () => {
    if (isRunning.value) return;
    if (!await db.get('kv', 'recovery:readDisclaimer')) {
        const noAskAgain = ref(false);
        if (!await confirm(h({
            render: () => h('div', null, [
                h('div', null, "The recovery console can execute ANY JavaScript code IN THE MAIN SCOPE of the application! Inappropriate use of this console can lead to XSS attacks, Data Exfiltration, or Unauthorized actions on your behalf. Before running any code, please review it very carefully. NEVER execute code that you don't recognize or is provided by those who you don't trust!!"),
                h('hr'),
                h(Checkbox, {
                    checked: noAskAgain.value,
                    'onUpdate:checked'(checked) {
                        noAskAgain.value = checked
                    },
                }, 'Do not ask again'),
            ]),
        }), 'Disclaimer')) return;
        if (noAskAgain.value) await db.put('kv', true, 'recovery:readDisclaimer')
    }
    isRunning.value = true;
    try {
        const c = structuredClone(usercmd.value);
        usercmd.value = '';
        messages.value.push(`> ${c}`);
        window.console.log('>', c);

        if (c === 'help') {
            messages.value.push(HELPTEXT);
            return;
        }

        const f = new Function('$', 'db', 'fs', `
        return ((async function () {
${c}
        })());
        `);
        const result = await f((q: string) => document.querySelector(q), db, fs);
        (window as any).LASTRESULT = result;
        window.console.log('<', result);

        let rtext: string;
        if (!result || typeof result !== 'object') {
            rtext = String(result);
        }
        else try {
            rtext = JSON.stringify(result, null, 2);
        } catch {
            rtext = `${result} (Unable to serialize into JSON)`;
        }
        messages.value.push('< ' + rtext);
    }
    catch (e) {
        const info = TraceErrorAndGetString(e);
        (window as any).LASTERROR = e;
        window.console.error(e);
        messages.value.push(info);
    }
    finally {
        isRunning.value = false;
        await nextTick();
        if (messageContainer.value) messageContainer.value.scrollTo({
            top: messageContainer.value.scrollHeight,
            behavior: 'smooth'
        });
    }
};
const HELPTEXT = `---Recovery Help---
Recovery is a simple JavaScript console with some internal application programming interfaces exposed. By using it, you can solve some problems that blocks the main application from running.
---
Exposed interfaces:
- db : The IndexedDB (idb, not native handle) object
- fs : The ZenFS Operations
---
Code execution context:
- Code will be wrapped into an async function
- Use 'return' statement to return result
- The successful result will be stored in 'LASTRESULT'
- Failed execution result will be displayed with stack info, and the error object will be stored in 'LASTERROR'
- A copy of the result will be delivered to the browser console
- Use Ctrl+L to clear console
- No console history will be recorded
---
**Please use at your own risk**. **NEVER** execute code that you don't recognize or is provided by those who you don't trust!`;
</script>

<style>
:root {
    background-color: #000;
    color: #fff;
}
a {
    color: #8ab4f8;
}
h1 {
    margin: 0;
}
.recovery-app {
    position: absolute;
    inset: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 10px;
}
hr {
    box-sizing: border-box;
    width: 100%;
}
.quick-operations {
    overflow-wrap: anywhere;
    margin-bottom: 1em;
    white-space: normal;
}
.quick-operations > .sep {
    margin: 0 0.5em;
}
.console-messages {
    flex: 1;
    overflow: auto;
    margin-bottom: 1em;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: Consolas, monospace;
}
.message {
    padding: 5px;
    border-radius: 5px;
    margin-bottom: 0.5em;
    box-sizing: border-box;
    background-color: #222;
}
.cmd-input {
    display: flex;
    gap: 0.5em;
}
.cmd {
    resize: none !important;
    height: 3em;
}
</style>
