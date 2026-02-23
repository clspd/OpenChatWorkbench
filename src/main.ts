import { createApp, h, ref } from 'vue'

import './cookiesTest'

import App from './App.vue'
import router from './router'
import init from './init'

import './userdata'

await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/resource/importer@1.0.0.js';
    s.onload = () => resolve(), s.onerror = reject;
    document.head.append(s);
}).catch((e) => {
    document.documentElement.appendChild(document.createElement("div")).append(document.createTextNode("Network error happened, please check your network connection."), document.createElement("br"), document.createTextNode(String(e)))
    throw e;
});

await importModule("/internal/init_config.js?ts=202602161150+0800");

import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import './i18n'
i18next.options.showSupportNotice = false;

import './styles/style.css'
import './styles/vars.css'
import { createPinia } from 'pinia'
import { Modal } from 'ant-design-vue'
import { TraceErrorAndGetString } from './utils/errorTrace'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(I18NextVue, { i18next })

try { await init(app) }
catch (e) {
    console.error('[main]', 'Failed to initialize the application:', e);
    Modal.error({
        title: "Fatal Error",
        content: h('div', {}, [
            h('b', { style: { color: 'red' } }, 'Unable to initialize the application'),
            h('div', {}, 'The application will not be able to work.'),
            h('hr'),
            h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
        ]),
        okText: "Reload page",
        onOk: () => (location.reload(), new Promise(() => { })),
    })
    throw e;
}

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
