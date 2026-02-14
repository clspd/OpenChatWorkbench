export enum WebcIPCMessageType {
    Load = "load",
    Init = "init",
}

export interface WebcIPCMessageMap {
    [WebcIPCMessageType.Load]: WebcIPCMessageLoadData;
    [WebcIPCMessageType.Init]: WebcIPCMessageInitData;
}

export interface WebcIPCMessage<T extends WebcIPCMessageType = WebcIPCMessageType> {
    isWebcIPCMessage: true;
    type: T;
    data: WebcIPCMessageMap[T];
}

export type WebcIPCMessageHandler<T extends WebcIPCMessageType = WebcIPCMessageType> = (message: WebcIPCMessage<T>) => void;
export type WebcIPCMessageHandlers = Set<WebcIPCMessageHandler<any>>;

export interface WebcIPCMessageLoadData { }; // Load event has no data fields

export interface WebcIPCMessageInitData {
    success: boolean; // whether the init process is successful
    error?: string; // error message if the init process fails
}

export function createWebcIPCMessage<T extends WebcIPCMessageType>(type: T, data: WebcIPCMessageMap[T]): WebcIPCMessage<T> {
    return {
        isWebcIPCMessage: true,
        type,
        data,
    };
}

const send = <T extends WebcIPCMessageType>(message: WebcIPCMessage<T>, target: Window) => {
    target.postMessage(message, window.location.origin);
};
export const { recv, waitUntil, on, removeHandler, removeAllHandlers } = (() => {
    const handlers = new Map<WebcIPCMessageType, WebcIPCMessageHandlers>();
    window.addEventListener("message", (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (typeof event.data !== "object" || !event.data || !event.data.isWebcIPCMessage) return
        const message = event.data as WebcIPCMessage;
        const h = handlers.get(message.type);
        if (h) h.forEach(handler => handler(message));
    });
    return {
        on<T extends WebcIPCMessageType>(type: T, handler: WebcIPCMessageHandler<T>) {
            const h = handlers.get(type) ?? new Set<WebcIPCMessageHandler<T>>();
            h.add(handler);
            handlers.set(type, h);
        },
        removeHandler<T extends WebcIPCMessageType>(type: T, handler: WebcIPCMessageHandler<T>) {
            const h = handlers.get(type);
            if (h) {
                h.delete(handler);
                if (h.size === 0) handlers.delete(type);
            }
        },
        removeAllHandlers<T extends WebcIPCMessageType>(type: T) {
            handlers.delete(type);
        },
        recv<T extends WebcIPCMessageType>(type: T, timeout?: number) {
            return new Promise<WebcIPCMessage<T>>((resolve, reject) => {
                const handler = (message: WebcIPCMessage<T>) => {
                    resolve(message);
                    this.removeHandler(type, handler);
                }
                this.on(type, handler);
                if (timeout != null) setTimeout(() => (reject(new Error("Timeout")), this.removeHandler(type, handler)), timeout);
            })
        },
        async waitUntil<T extends WebcIPCMessageType>(type: T, timeout?: number) {
            await this.recv(type, timeout);
        },
    }
})();

export const sendWebcIPCMessage = <T extends WebcIPCMessageType>(type: T, data: WebcIPCMessageMap[T], target: Window) => send(createWebcIPCMessage(type, data), target);

