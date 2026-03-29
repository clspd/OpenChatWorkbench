import { useConversationStore } from "@/stores/conversationStore";
import { useAppStateSessionStore } from "@/stores/appStateSession";
import type { FileAttachmentInfo } from "@/types/message";
import { DeleteAttachment } from "./attachment";

const OpenedAttachments = new Set<string>();

export function MarkAttachmentAsUse(hash: string, bIsUse: boolean) {
    if (bIsUse) return OpenedAttachments.add(hash);
    else return OpenedAttachments.delete(hash);
}

export async function CleanupOrphanedAttachments() {
    // get a list of attachments and find which is not referenced or in use
    const notRef = new Set<FileAttachmentInfo>();
    const appStateSession = useAppStateSessionStore();
    const editBufferRef = new Set<string>(); // id
    for (const i of Object.values(appStateSession.chatEditBuffer)) {
        for (const j of i.files) editBufferRef.add(j.id);
    }
    for (const i of useConversationStore().attachmentsIndex.values()) { 
        if (i.referenceCount < 1 && !OpenedAttachments.has(i.hash) && !editBufferRef.has(i.id))
            notRef.add(i);
    }

    // remove them
    let total = 0, fail = 0;
    for (const i of notRef) {
        // still no reference?
        if (i.referenceCount < 1) try {
            await DeleteAttachment(i.id);
            ++total;
        } catch { ++fail }
    }

    if (total || fail) console.info('[attachment]', 'Attempted to remove orphanrd attachments,', total, 'success', fail, 'fail');
}

