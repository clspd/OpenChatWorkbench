// convPref.ts: save user's conversation preferences
import { fs } from "@/userdata";
import type { ConversationUserPref } from "@/types/conversation";
import { getConvPrefPath } from "./path";
import { SchemaVersion } from "@/types/message";
import { dumpConversationPref } from "./dumper";
import { useConversationStore } from "@/stores/conversationStore";

export async function InitConversationPreference(id: string) {
    const pref: ConversationUserPref = {
        schemaVersion: SchemaVersion.V1,
        id,
        pinned: false,
        msgChainChoices: [],
    };
    await fs.writeFile(getConvPrefPath(id), dumpConversationPref(pref));
    // add preference to memory cache
    useConversationStore().preferences.set(id, pref);
    return pref;
}

export async function LoadConversationPreference(id: string): Promise<ConversationUserPref> {
    const data = new TextDecoder().decode(await fs.readFile(getConvPrefPath(id)));
    if (!data) {
        // automatically initialize preference file
        return await InitConversationPreference(id);
    }
    const json = JSON.parse(data) as ConversationUserPref;
    if (!json || json.schemaVersion !== SchemaVersion.V1 || json.id !== id) {
        throw new Error("Invalid conversation preference file");
    }
    // add preference to memory cache
    useConversationStore().preferences.set(id, json);
    return json;
}

export async function UpdateConversationPreferenceInternal(id: string, pref: ConversationUserPref) {
    console.debug("[convPref]", "UpdateConversationPreferenceInternal", "for", id, "t=", Date.now());
    await fs.writeFile(getConvPrefPath(id), dumpConversationPref(pref));
}

export async function DeleteConversationPreference(id: string) {
    await fs.unlink(getConvPrefPath(id));
    // clear memory cache
    useConversationStore().removePrefFromStore(id);
}

