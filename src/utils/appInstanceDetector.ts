import { app_name_id } from '@/config'

window.addEventListener('storage', (event) => {
    if (event.key === app_name_id + '@instance_detector') {
        window.localStorage.setItem(app_name_id + '@instance_detector', Math.random().toString())
    }
})

export function IsFirstInstance(timeout = 1000) {
    return new Promise<boolean>(function (resolve, reject) {
        const random = Math.random().toString()
        const f = function (ev: StorageEvent) {
            if (ev.key === app_name_id + '@instance_detector' && ev.newValue !== random) {
                resolve(false)
            }
        }
        window.addEventListener('storage', f)
        window.setTimeout(() => {
            resolve(window.localStorage.getItem(app_name_id + '@instance_detector') === random)
            window.removeEventListener('storage', f)
        }, timeout)
        // trigger the event
        window.localStorage.setItem(app_name_id + '@instance_detector', random)
    })
}
