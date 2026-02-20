import { h } from "vue";
import { message, Modal } from "ant-design-vue";
import { CreateConversation, DeleteConversation, LoadConversation, UpdateConversationInfo } from "../chat/conversation";
import { useAppStateStore } from "@/stores/appState";
import type { Router } from "vue-router";
import { LoadConversationPreference } from "../chat/convPref";

export async function handleRequestDeleteConversation(cid: string, showConfirm = true, router?: Router) {
    const conv = await LoadConversation(cid);
    let res = false;
    if (showConfirm) {
        res = await new Promise<boolean>((r, j) => Modal.confirm({
            title: 'Delete Conversation',
            content: h('div', null, [
                h('span', null, 'Are you sure you want to delete conversation '),
                h('span', { style: { userSelect: 'all', fontWeight: 'bold' } }, conv.session.title),
                h('span', null, '?'),
            ]),
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            onOk: () => {
                return DeleteConversation(cid).then(() => {
                    message.success('Conversation deleted');
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

