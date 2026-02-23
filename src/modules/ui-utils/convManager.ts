import { h } from "vue";
import { message, Modal } from "ant-design-vue";
import { DeleteConversation, LoadConversation, UpdateConversationInfo } from "../chat/conversation";
import { useAppStateStore } from "@/stores/appState";
import type { Router } from "vue-router";
import { LoadConversationPreference } from "../chat/convPref";
import { t } from "i18next";

export async function handleRequestDeleteConversation(cid: string, showConfirm = true, router?: Router) {
    const convTitle = await (async () => {
        try {
            const conv = await LoadConversation(cid);
            return conv.session.title;
        }
        catch { return cid }
    })();
    let res = false;
    if (showConfirm) {
        res = await new Promise<boolean>((r, j) => Modal.confirm({
            title: t('chat:management.requests.delete.title'),
            content: h('div', null, [
                h('span', null, t('chat:management.requests.delete.content')),
                h('span', { style: { userSelect: 'all', fontWeight: 'bold' } }, convTitle),
                h('span', null, '?'),
            ]),
            okText: t('chat:management.requests.delete.okText'),
            okType: 'danger',
            cancelText: t('chat:management.requests.delete.cancelText'),
            onOk: () => {
                return DeleteConversation(cid).then(() => {
                    message.success(t('chat:management.requests.delete.success'));
                    r(true);
                }).catch(j);
            },
            onCancel: () => r(false),
        }))
    }
    else {
        await DeleteConversation(cid);
        res = true;
    }
    // cleanup
    // if current conversation is deleted, go back to `New Conversation`
    if (res && useAppStateStore().currentConversationId === cid) {
        router?.replace('/');
    }
    return res;
}

export async function handleRequestRenameConversation(cid: string, newTitle: string) {
    const conv = await LoadConversation(cid);
    await UpdateConversationInfo(conv.id, newTitle);
}

export async function handleRequestPinConversation(cid: string, pinned: boolean) {
    const pref = await LoadConversationPreference(cid);
    pref.pinned = pinned;
    await UpdateConversationInfo(cid, undefined, pref.pinned);
}

