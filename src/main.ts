import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import init from './init'
import './userdata'

await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/internal/init_config.js?ts=202602110341+0800';
    s.onload = () => resolve(), s.onerror = reject;
    document.head.append(s);
})

import './styles/style.css'
import './styles/vars.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

await init()

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
