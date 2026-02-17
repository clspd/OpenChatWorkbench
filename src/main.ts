import { createApp, h } from 'vue'

import './cookiesTest'

import App from './App.vue'
import router from './router'
import init from './init'

await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/internal/init_config.js?ts=202602161150+0800';
    s.onload = () => resolve(), s.onerror = reject;
    document.head.append(s);
})

await import('./userdata')

import './styles/style.css'
import './styles/vars.css'
import { Modal } from 'ant-design-vue'

const app = createApp(App)

const { createPinia } = await import('pinia')
app.use(createPinia())
app.use(router)

try { await init() }
catch (e) {
    console.error('[main]', 'Failed to initialize the application:', e);
    Modal.error({
        title: "Fatal Error",
        content: h('div', {}, [
            h('b', { style: { color: 'red' } }, 'Unable to initialize the application'),
            h('div', {}, 'The application will not be able to work.'),
            h('hr'),
            h('div', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }, String(e) + '\n' + String(e && (e as any).stack)),
        ]),
        okText: "Reload page",
        onOk: () => (location.reload(), new Promise(() => { })),
    })
    throw e;
}

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
