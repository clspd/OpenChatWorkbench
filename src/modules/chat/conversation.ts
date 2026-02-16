// conversation.ts: manage and load conversations.
import { SchemaVersion, type Message } from "@/types/message";
import type { Conversation, ConversationUserPref } from "@/types/conversation";
import { fs } from "@/userdata";
import { getConvPath, getConvPrefPath } from "./path";
import { dumpConversationData, dumpConversationPref } from "./dumper";
import { AddConversationToIndex, GetCurrentConvIndexId } from "./convIndex";
import { useConversationStore } from "@/stores/conversationStore";

export async function CreateConversation(title = "New Conversation"): Promise<string> {
    const id = crypto.randomUUID(), ts = Date.now();

    // create Preference File
    const pref = {
        schemaVersion: SchemaVersion.V1,
        id,
        current_message_id: 0,
        pinned: false,
        last_access_at: ts,
    } as ConversationUserPref;
    await fs.writeFile(getConvPrefPath(id), dumpConversationPref(pref));

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
    const conv = useConversationStore().conversations.get(id);
    if (conv) return conv;
    const convRaw = await LoadConversationRaw(id);
    useConversationStore().conversations.set(id, convRaw);
    return convRaw;
}

export async function UpdateConversation(id: string, data: Conversation) {
    if (!(await fs.exists(getConvPath(id)))) throw new Error("The conversation specified does not exist.");
    await fs.writeFile(getConvPath(id), dumpConversationData(data));
}

export async function UpdateConversationInfo(id: string, title?: string, pinned?: boolean) {
    throw new Error("Not implemented")
    try {

        return true;
    }
    catch { return false }
}

export async function InsertMessageToConversation(id: string, message: Message) {
    // load conversation
    let conv = await LoadConversation(id);
    // append message
    conv.messages.push(message);
}

export async function EditMessageInConversation(id: string, msgId: number, newMsg: Message) {
    // load conversation
    let conv = await LoadConversation(id);
    // find message
    const index = conv.messages.findIndex(m => m.id === msgId);
    if (index === -1) throw new Error("The message specified does not exist.");
    // update message
    conv.messages[index] = newMsg;
}

