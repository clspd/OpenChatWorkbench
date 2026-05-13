import { createApp, h } from 'vue'

import './cookiesTest'

import App from './App.vue'
import router from './router'
import init from './init'
import { init_config_ts_value } from './config'

import './userdata'

await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/resource/importer@1.0.1.js';
    s.onload = () => resolve(), s.onerror = reject;
    document.head.append(s);
}).catch((e) => {
    document.documentElement.appendChild(document.createElement("div")).append(document.createTextNode("Network error happened, please check your network connection."), document.createElement("br"), document.createTextNode(String(e)))
    throw e;
});

await importModule("/internal/init_config.js?ts=" + init_config_ts_value);

import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import './i18n'

import './styles/style.css'
import './styles/vars.css'
import { createPinia } from 'pinia'
import { Modal } from 'ant-design-vue'
import { TraceErrorAndGetString } from './utils/errorTrace'
import { CloseCircleFilled } from '@ant-design/icons-vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(I18NextVue, { i18next })

try { await init(app); window.sessionStorage.removeItem('app_init_failure_count') }
catch (e) {
    console.error('[main]', 'Failed to initialize the application:', e);
    const configBase = ({
        title: "Fatal Error",
        content: h('div', {}, [
            h('b', { style: { color: 'red' } }, 'Unable to initialize the application'),
            h('div', {}, 'The application will not be able to work.'),
            h('hr'),
            h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, TraceErrorAndGetString(e)),
        ]),
        icon: h(CloseCircleFilled, { style: { color: '#ff4d4f' } }),
        okText: "Try again",
        onOk: () => (location.reload(), new Promise(() => {})),
    });
    const failureCount = Number(window.sessionStorage.getItem('app_init_failure_count'));
    if (!isNaN(failureCount) && (failureCount < 0 || failureCount > 2)) {
        Modal.confirm({
            ...configBase,
            cancelText: "Recovery",
            onCancel: () => (location.href = '/recovery.html', new Promise(() => {})),
        });
    } else {
        window.sessionStorage.setItem('app_init_failure_count', isNaN(failureCount) ? '1' : String(failureCount + 1));
        Modal.error(configBase);
    }
    throw e;
}

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
