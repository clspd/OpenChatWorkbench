import { chatPersonalizationDataBasePath } from "@/modules/chat/path";
import { fs } from "@/userdata";

let lock = new Map<string, Promise<string>>();

export function GetCustomAvatarUrl(role: string) {
    if (lock.has(role)) {
        return lock.get(role)!;
    }
    const promise = new Promise<string>((resolve, reject) => {
        fs.readFile(chatPersonalizationDataBasePath + "useravatar_" + role).then((data) => {
            resolve(URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>])));
        }).catch((e) => {
            reject(e);
            lock.delete(role);
        });
    });
    lock.set(role, promise);
    return promise;
}

export function clearAvatarCache() {
    for (const i of lock) {
        i[1].then(url => URL.revokeObjectURL(url));
    }
    lock.clear();
}
