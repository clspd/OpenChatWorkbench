import { app_name_id } from '@/config'

const instId = crypto.randomUUID();
window.addEventListener('storage', (event) => {
    if (event.key === app_name_id + '@pingInstance') {
        const instances = String(event.newValue).split("|");
        if (instances.includes(instId)) return;
        instances.push(instId);
        window.localStorage.setItem(app_name_id + '@pingInstance', instances.join("|"));
    }
})

export function IsFirstInstance(timeout = 1000) {
    return new Promise<boolean>(function (resolve, reject) {
        const random = Math.random().toString()
        const f = function (ev: StorageEvent) {
            if (ev.key === app_name_id + '@pingInstance' && !String(ev.newValue).split("|").includes(instId)) {
                resolve(false)
            }
        }
        window.addEventListener('storage', f)
        window.setTimeout(() => {
            resolve(window.localStorage.getItem(app_name_id + '@pingInstance') === random)
            setTimeout(() => window.localStorage.removeItem(app_name_id + '@pingInstance'), Math.floor(Math.random() * 10000))
            window.removeEventListener('storage', f)
        }, timeout)
        // trigger the event
        window.localStorage.setItem(app_name_id + '@pingInstance', random)
    })
}
