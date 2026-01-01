import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import init from './init'

const app = createApp(App)

app.use(createPinia())
app.use(router)

await init()

app.mount(window.document.querySelector(':root > body > vue-app') ?? window.document.body.appendChild(window.document.createElement('vue-app')))
