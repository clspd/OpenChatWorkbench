// convIndex.ts: manage conversation index.
import type { ConversationIndex, ConversationIndexItem } from "@/types/conversation";
import { chatIndexCurrentFile, getChatIndexPath } from "./path";
import { fs } from "@/userdata";
import { SchemaVersion } from "@/types/message";
import { useConversationStore } from "@/stores/conversationStore";

export async function GetCurrentConvIndexId(ignoreCache = false) {
    const store = useConversationStore();

    if (!ignoreCache && store.currentIndexId) return store.currentIndexId;
    // get current index id
    try {
        const currentID = +(new TextDecoder().decode(await fs.readFile(chatIndexCurrentFile)));
        if (!currentID || Number.isNaN(currentID)) return 0;
        store.currentIndexId = currentID;
        return currentID;
    }
    catch { return 0 }
}

export async function SetCurrentConvIndexId(indexId: number) {
    await fs.writeFile(chatIndexCurrentFile, new TextEncoder().encode(String(indexId)));
    useConversationStore().currentIndexId = indexId;
}

// this function returns reference, not value
export async function LoadConvIndex(indexId?: number, ignoreCache = false): Promise<ConversationIndex | null> {
    const { index: cachedIndex, currentIndexId: cachedCurrentIndexId } = useConversationStore();

    if ((indexId != undefined) && cachedIndex.has(indexId) && !ignoreCache) {
        const v = cachedIndex.get(indexId);
        if (v) return v;
    }

    let content;
    try {
        if (indexId == undefined) {
            indexId = cachedCurrentIndexId;
            if (!indexId) {
                indexId = await GetCurrentConvIndexId();
            }
        }
    
        // load index
        content = await fs.readFile(getChatIndexPath(indexId));
    }
    catch { return null }

    content = JSON.parse(new TextDecoder().decode(content)) as ConversationIndex;
    if (typeof content !== 'object' || !content || !content.schemaVersion || content.schemaVersion !== SchemaVersion.V1)
        throw new Error("The conversation index file is invalid.");
    cachedIndex.set(indexId, content);
    return content;
}

export async function InitConvIndex() {
    let indexId = (await GetCurrentConvIndexId());
    // if `current` file not exists, create it.
    if (!indexId) SetCurrentConvIndexId(indexId = 1);
    // if the index file does not exist, create it.
    if (!(await fs.exists(getChatIndexPath(indexId)))) {
        await fs.writeFile(getChatIndexPath(indexId), new TextEncoder().encode(JSON.stringify(({
            schemaVersion: SchemaVersion.V1,
            conversations: [],
            previous: indexId - 1,
        }) as ConversationIndex)));
    }
    // load latest index
    await LoadConvIndex(indexId);
}

export async function AddConversationToIndex(indexId: number, item: ConversationIndexItem) {
    let index = await LoadConvIndex(indexId);
    if (!index) throw new Error("The conversation index specified does not exist.");
    // TODO: automatically expand the index file if it is full
    index.conversations.push(item);
    useConversationStore().saveConvIndex(indexId);
}

export async function RemoveConversationFromIndex(indexId: number, itemId: string) {
    let index = await LoadConvIndex(indexId);
    if (!index) throw new Error("The conversation index specified does not exist.");
    const indexItemIndex = index.conversations.findIndex(x => x.id === itemId);
    if (indexItemIndex < 0) throw new Error("The conversation specified does not exist in the index.");
    index.conversations.splice(indexItemIndex, 1);
    useConversationStore().saveConvIndex(indexId);
}

export async function RemoveConversationFromAnyIndex(itemId: string) {
    let indexId = await GetCurrentConvIndexId();
    while (indexId > 0) {
        const indexData = await LoadConvIndex(indexId);
        if (!indexData) break;
        const indexItemIndex = indexData.conversations.findIndex(x => x.id === itemId);
        if (indexItemIndex >= 0) {
            indexData.conversations.splice(indexItemIndex, 1);
            useConversationStore().saveConvIndex(indexId);
            return true;
        }
        indexId = indexData.previous;
    }
    return false;
}

export async function UpdateConversationIndex(indexId: number, item: ConversationIndexItem) {
    let index = await LoadConvIndex(indexId);
    if (!index) throw new Error("The conversation index specified does not exist.");
    const indexItemIndex = index.conversations.findIndex(x => x.id === item.id);
    if (indexItemIndex < 0) throw new Error("The conversation specified does not exist in the index.");
    index.conversations[indexItemIndex] = item;
    useConversationStore().saveConvIndex(indexId);
}

export async function UpdateConversationIndexAuto(item: ConversationIndexItem) {
    let indexId = await GetCurrentConvIndexId();
    while (indexId > 0) {
        const indexData = await LoadConvIndex(indexId);
        if (!indexData) break;
        const indexItemIndex = indexData.conversations.findIndex(x => x.id === item.id);
        if (indexItemIndex >= 0) {
            indexData.conversations[indexItemIndex] = item;
            useConversationStore().saveConvIndex(indexId);
            return true;
        }
        indexId = indexData.previous;
    }
    return false;
}

export async function UpdateConversationIndexAutoPartial(item: Partial<ConversationIndexItem> & { id: string }) {
    let indexId = await GetCurrentConvIndexId();
    while (indexId > 0) {
        const indexData = await LoadConvIndex(indexId);
        if (!indexData) break;
        const indexItemIndex = indexData.conversations.findIndex(x => x.id === item.id);
        if (indexItemIndex >= 0) {
            for (const key of Reflect.ownKeys(item)) {
                if (key !== 'id') {
                    Reflect.set(indexData.conversations[indexItemIndex]!, key, Reflect.get(item, key));
                }
            }
            useConversationStore().saveConvIndex(indexId);
            return true;
        }
        indexId = indexData.previous;
    }
    return false;
}


