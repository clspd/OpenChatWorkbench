import { WebContainer } from '@webcontainer/api';
import type { WebcIPCMessage, WebcIPCMessageHandler, WebcIPCMessageHandlers, WebcIPCMessageMap } from '@/utils/webcIPCMessage';
import { createWebcIPCMessage, WebcIPCMessageType } from '@/utils/webcIPCMessage';
import { sendWebcIPCMessage } from '@/utils/webcIPCMessage';
if (window.parent === window.self) {
    throw new Error("This page is not intended to be accessed directly. Please access the main application.");
}

// Window is loaded, post `load` event
sendWebcIPCMessage(WebcIPCMessageType.Load, {}, window.parent);

try {
    // Call only once
    const webcontainerInstance = await WebContainer.boot();
    sendWebcIPCMessage(WebcIPCMessageType.Init, { success: true }, window.parent);
}
catch (error) {
    sendWebcIPCMessage(WebcIPCMessageType.Init, { success: false, error: String(error) }, window.parent);
    throw error;
}

