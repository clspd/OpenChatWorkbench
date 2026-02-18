// path.ts: manage conversation paths.

import { fs } from "@/userdata";
import { CloseCircleFilled } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { h } from "vue";

export const chatBasePath = "data/";
export const chatIndexBasePath = chatBasePath + "index/";
export const chatIndexCurrentFile = chatIndexBasePath + "current";
export const chatAttachmentBasePath = chatBasePath + "attachment/";
export const getConvPath = (id: string) => chatBasePath + 'conversations/' + id;
export const getConvPrefPath = (id: string) => chatBasePath + 'conv_pref/' + id;
export const getChatIndexPath = (n: number) => chatIndexBasePath + n;
export const getChatAttachmentPath = (id: string, aid: string) => chatAttachmentBasePath + id + '_' + aid;

export async function createChatBaseStructure() {
    const ensureDir = async (path: string) => (((await fs.exists(path)) && (await fs.stat(path)).isDirectory()) || await fs.mkdir(path));
    try {
        await ensureDir(chatBasePath);
        await ensureDir(chatIndexBasePath);
        await ensureDir(chatAttachmentBasePath);
        await ensureDir(getConvPath(''));
        await ensureDir(getConvPrefPath(''));
    }
    catch (e) {
        console.error('[chat/path]', "Error creating chat base structure:", e);
        Modal.confirm({
            icon: h(CloseCircleFilled, { style: { color: "red" } }),
            title: "Fatal Error",
            content: h('div', null, [
                h('div', null, "Unable to create chat data structure. The application will not work properly."),
                h('hr'),
                h('div', { style: { "whiteSpace": "pre-wrap", "wordBreak": "break-all" } }, `${e}\n${e && (e as any)?.stack}`),
            ]),
            okText: "Reload page",
            cancelText: "Dismiss",
            onOk: () => {
                window.location.reload();
                return new Promise(() => { });
            },
            onCancel: () => {
                message.error("The problem is fatal. The application will not work properly, even if you dismiss this message.");
            },
        })
    }
}
