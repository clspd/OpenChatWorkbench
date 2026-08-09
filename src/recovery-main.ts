import { createApp, h, ref } from 'vue'

import './cookiesTest'

import App from './Recovery.vue'
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

import { Modal } from 'ant-design-vue'

const app = createApp(App)

if (await new Promise<boolean>(resolve => Modal.confirm({
    title: 'Recovery',
    content: "You are accessing the Recovery of the application, which is prepared for some extreme cases. Normally you are supposed to access the main application.",
    cancelText: 'Continue anyway',
    okText: 'Bring me to the main app',
    onOk: () => resolve(true),
    onCancel: () => resolve(false),
}))) { 
    location.replace('/');
    await new Promise(() => {});
}

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
