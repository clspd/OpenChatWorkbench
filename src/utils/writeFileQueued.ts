import { fs } from "@/userdata";

const writeQueue = new Map<string, {
    promise: Promise<void>;
    newData?: any;
}>();

// This is a very simple implemention and does NOT normalize the path
// Do not use unless you know what you're doing
export function writeFileQueued(path: string, data: any, options?: any) {
    const task = writeQueue.get(path);
    
    let newPromise: Promise<void>;
    newPromise = new Promise<void>((resolve, reject) => {
        if (task) {
            task.promise.finally(() => {
                if (writeQueue.get(path)?.promise !== newPromise)
                    return resolve(); // A newer task has been queued, give up the old one
                work(path, data, options, newPromise, resolve, reject);
            });
        }
        else {
            work(path, data, options, newPromise, resolve, reject);
        }
    });
    writeQueue.set(path, {
        promise: newPromise,
        newData: data
    });
    return newPromise;
}

function work(path: string, data: any, options: any, newPromise: Promise<void>, resolve: () => void, reject: (e: any) => void) { 
    fs.writeFile(path, data, options).then(resolve).catch(reject).finally(() => {
        if (writeQueue.get(path)?.promise === newPromise)
            writeQueue.delete(path); // No newer tasks
    });
}

