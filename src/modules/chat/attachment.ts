// attachment.ts: message attachment create & management
import { fs } from "@/userdata";
import { chatAttachmentIndexCurrentFile, getAttachmentIndexPath, getChatAttachmentPath } from "./path";
import type { FileAttachmentInfo, FileAttachmentInfoBase } from "@/types/message";
import { useConversationStore } from "@/stores/conversationStore";
import { bsha256 } from "@/utils/sha256";

export const MAX_POSSIBLE_TEXT_CONTENT_FILE_SIZE = 1024 * 1024 * 32; // 32MiB -- currently no LLM has such a long context window
export const MAX_POSSIBLE_MESSAGE_FILES_TOTAL_SIZE = 1024 * 1024 * 64; // 64MiB -- avoiding memory boom

export async function LoadAttachmentIndex(indexId: number): Promise<Record<string, FileAttachmentInfo>> {
    const indexContent = JSON.parse(new TextDecoder().decode(await fs.readFile(getAttachmentIndexPath(indexId))));
    return indexContent;
}

export async function InitAttachmentIndex() {
    try {
        const current = await fs.readFile(chatAttachmentIndexCurrentFile);
        if (current.length < 1 || current.length > (Number.MAX_SAFE_INTEGER.toString()).length) {
            throw new Error("Invalid attachment index current file");
        }
        const index = Number(new TextDecoder().decode(current));
        if (isNaN(index)) {
            throw new Error("Invalid attachment index current file");
        }
        const indexContent = await LoadAttachmentIndex(index);
        useConversationStore().attachmentsIndex = new Map(Object.entries(indexContent));
        useConversationStore().attaIndexCurrentId = index;
    }
    catch {
        useConversationStore().attaIndexCurrentId = 1;
        await fs.writeFile(chatAttachmentIndexCurrentFile, "1");
        await fs.writeFile(getAttachmentIndexPath(1), JSON.stringify({}));
    }
}

export async function SaveAttachmentIndex() {
    const indexId = useConversationStore().attaIndexCurrentId;
    // const newContent = await LoadAttachmentIndex(indexId);
    // Object.assign(newContent, Object.fromEntries(useConversationStore().attachmentsIndex.entries()));
    // await fs.writeFile(getAttachmentIndexPath(indexId), JSON.stringify(newContent));
    await fs.writeFile(getAttachmentIndexPath(indexId), JSON.stringify(Object.fromEntries(useConversationStore().attachmentsIndex.entries())));
}

export function StripAttachmentInternalInfo({ id, name, type, size, hash }: FileAttachmentInfo): FileAttachmentInfoBase {
    return {
        id, name, type, size, hash,
    }
}

export async function GetAttachmentById(id: string, type?: string) {
    return new Blob([await fs.readFile(getChatAttachmentPath(id)) as Uint8Array<ArrayBuffer>], { type });
}

export async function GetAttachmentIdByHash(hash: string): Promise<string | null> {
    const idx = useConversationStore().attachmentsIndex.get(hash);
    return idx ? idx.id : null;
}

export async function GetAttachmentByHash(hash: string) {
    const id = await GetAttachmentIdByHash(hash);
    if (!id) throw new TypeError('The attachment specified couldn\'t be found.');
    return await GetAttachmentById(id);
}

export async function PutAttachment(data: Blob | File, weak: boolean = false): Promise<FileAttachmentInfoBase> {
    // compute hash first
    const hash = await bsha256(data);
    // check if hash already exists
    const idx = useConversationStore().attachmentsIndex.get(hash);
    if (idx) {
        // if found, increment ref count
        if (!weak) {
            ++idx.referenceCount;
            await useConversationStore().setAttachmentIndex(idx.hash, idx);
        }
        return StripAttachmentInternalInfo(idx);
    }
    // if not, create a new entry
    const id = crypto.randomUUID();
    await fs.writeFile(getChatAttachmentPath(id), new Uint8Array(await data.arrayBuffer()));
    const info: FileAttachmentInfoBase = {
        id,
        name: data instanceof File ? data.name : id,
        type: data.type || 'application/octet-stream',
        size: data.size,
        hash,
    };
    const withRef = {
        ...info,
        referenceCount: weak ? 0 : 1,
    };
    // add to index
    await useConversationStore().setAttachmentIndex(hash, withRef);
    return info;
}

export async function CommitAttachment(id: string) {
    const idx = Array.from(useConversationStore().attachmentsIndex.values()).find((item) => item.id === id);
    if (!idx) throw new TypeError('The attachment specified does not exist in the database.');
    ++idx.referenceCount;
    await useConversationStore().setAttachmentIndex(idx.hash, idx);
}

export async function DeleteAttachment(id: string, weak: boolean = false) {
    // check the ref count
    const idx = Array.from(useConversationStore().attachmentsIndex.values()).find((item) => item.id === id);
    if (idx) {
        if (!weak) --idx.referenceCount;
        if (idx.referenceCount > 0) {
            if (!weak) await useConversationStore().setAttachmentIndex(idx.hash, idx);
            return;
        }
        if (weak) return; // temporarily keep the file
        // if ref count is 0 (last reference), delete the file
        try {
            await fs.unlink(getChatAttachmentPath(id));
        }
        catch (e) {
            if (e && (e as any).code === 'ENOENT') {
                // file not found, ignore
            }
            else {
                throw e;
            }
        }
        if (!useConversationStore().attachmentsIndex.delete(idx.hash)) {
            console.error("[DeleteAttachment]", `Failed to delete attachment index entry for ${id}`);
        }
        await SaveAttachmentIndex();
    }
    else {
        // if not found, directly delete the file
        await fs.unlink(getChatAttachmentPath(id));
    }
}

