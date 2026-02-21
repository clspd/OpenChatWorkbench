// conversation.ts: manage and load conversations.
import { SchemaVersion, type Message } from "@/types/message";
import type { Conversation } from "@/types/conversation";
import { fs } from "@/userdata";
import { getConvPath, getConvPrefPath } from "./path";
import { dumpConversationData, dumpConversationPref } from "./dumper";
import { AddConversationToIndex, GetCurrentConvIndexId, RemoveConversationFromAnyIndex, UpdateConversationIndexAuto } from "./convIndex";
import { useConversationStore } from "@/stores/conversationStore";
import { InitConversationPreference, LoadConversationPreference, UpdateConversationPreferenceInternal } from "./convPref";
import i18next from "i18next";

export const CONVERSATION_MAX_MESSAGE_COUNT = 2500;
export const CONVERSATION_MAX_DEPTH = CONVERSATION_MAX_MESSAGE_COUNT;

export async function CreateConversation(title = i18next.t("common:conversation.defaultTitle")): Promise<string> {
    const id = crypto.randomUUID(), ts = Date.now();

    // create Preference File
    await InitConversationPreference(id);

    // create Conversation File
    const conv = {
        schemaVersion: SchemaVersion.V1,
        id,
        session: {
            created_at: ts,
            updated_at: ts,
            title,
            title_type: "SYSTEM",
        },
        messages: [],
    } as Conversation;
    await fs.writeFile(getConvPath(id), dumpConversationData(conv));

    // add conversation to index
    await AddConversationToIndex(await GetCurrentConvIndexId(), {
        id,
        created_at: ts,
        updated_at: ts,
        title,
        pinned: false,
    });

    // returns conversation id
    return id;
}

/**
 * Load conversation data from file.
 * @param id Conversation id
 * @returns Conversation data
 */
export async function LoadConversationRaw(id: string): Promise<Conversation> {
    if (!(await fs.exists(getConvPath(id)))) throw new Error("The conversation specified does not exist.");

    const data = await fs.readFile(getConvPath(id));
    return JSON.parse(new TextDecoder().decode(data)) as Conversation;
}

/**
 * Load conversation data from memory cache or file.
 * @param id Conversation id
 * @returns Conversation reference, which can be edited in place
 */
export async function LoadConversation(id: string): Promise<Conversation> {
    const conv = useConversationStore().getConvFromStore(id);
    if (conv) return conv;
    const convRaw = await LoadConversationRaw(id);
    useConversationStore().addConvToStore(id, convRaw);
    return convRaw;
}

export async function UpdateConversation(id: string, data: Conversation) {
    if (!(await fs.exists(getConvPath(id)))) throw new Error("The conversation specified does not exist.");
    await useConversationStore().updateConvInStore(id, data);
    await UpdateConversationInfo(id);
}

/**
 * Updates conversation information.
 * @param id Conversation id
 * @param title New title. Optional
 * @param pinned New pinned status. Optional
 * @example 
 * UpdateConversationInfo("12345678-1234-1234-1234-1234567890ab", "New Title", true); // set title and pin
 * UpdateConversationInfo("12345678-1234-1234-1234-1234567890ab", undefined, false); // unpin conversation
 * UpdateConversationInfo("12345678-1234-1234-1234-1234567890ab"); // update the `updated_at` field
 */
export async function UpdateConversationInfo(id: string, title?: string, pinned?: boolean) {
    // update conversation itself
    const conv = await LoadConversation(id);
    if (title) {
        conv.session.title = title;
        conv.session.title_type = "USER";
        conv.session.updated_at = Date.now();
        await UpdateConversation(id, conv);
    }
    // update conversation preference file
    const pref = await LoadConversationPreference(id);
    if (pinned !== undefined) {
        pref.pinned = pinned;
        await UpdateConversationPreferenceInternal(id, pref);
    }
    // update index data
    await UpdateConversationIndexAuto({
        id,
        title: conv.session.title,
        pinned: pref.pinned,
        created_at: conv.session.created_at,
        updated_at: Date.now(),
    });
}

export async function DeleteConversation(id: string) {
    if (!(await fs.exists(getConvPath(id)))) throw new Error("The conversation specified does not exist.");
    // stop any ongoing request
    const store = useConversationStore();
    if (store.requestsInProgress.has(id)) {
        store.requestsInProgress.get(id)?.cancelToken?.abort();
        store.requestsInProgress.delete(id);
        await new Promise(r => requestAnimationFrame(r));
    }
    // cleanup index
    await RemoveConversationFromAnyIndex(id);
    // remove from memory cache
    store.removeConvFromStore(id);
    store.removePrefFromStore(id);
    // remove file
    await fs.unlink(getConvPath(id));
    await fs.unlink(getConvPrefPath(id));
}

export async function InsertMessageToConversation(id: string, message: Message) {
    // load conversation
    let conv = await LoadConversation(id);
    // append message
    conv.messages.push(message);
    // update conversation
    await UpdateConversationInfo(id);
    await useConversationStore().updateConvInStore(id, conv);
}

export async function GetConvNextMessageId(cid: string) {
    const conv = await LoadConversation(cid);
    return conv.messages.length + 1;
}

export async function EditMessageInConversation(id: string, msgId: number, newMsg: Message) {
    // load conversation
    let conv = await LoadConversation(id);
    // find message
    const index = conv.messages.findIndex(m => m.id === msgId);
    if (index === -1) throw new Error("The message specified does not exist.");
    // update message
    conv.messages[index] = newMsg;
    // update conversation
    await useConversationStore().updateConvInStore(id, conv);
}

