// message.ts: functions about message management
import { MessageContentType, MessageFragmentType, MessageStatus, type FileAttachmentInfo, type Message, type MessageContent, type MessageFeatureItem, type MessageRole } from "@/types/message";
import type { ChatCompletionChunk } from "openai/resources";
import { GetResponseChunkFragmentType } from "../chat-remotes/provider";

/**
 * Create a user or system message. Use the `role` parameter to specify the role of the message.
 */
export const CreateUserMessage = (
    id: number,
    parent_id: number | null,
    role: MessageRole,
    contentType: MessageContentType,
    content: MessageContent<typeof contentType>,
    files: FileAttachmentInfo[] = [],
): Message => ({
    id,
    parent_id,
    role,
    status: MessageStatus.Finished,
    files,
    fragments: [
        {
            id: 0,
            type: MessageFragmentType.Request,
            contentType,
            content,
        },
    ],
    has_pending_fragment: false,
});

// --------

export function AppendMessageFragmentChunk(msg: Message, fragmentId: number, chunk: ChatCompletionChunk, useChoices = false) {
    const fragment = msg.fragments.find(f => f.id === fragmentId);
    if (!fragment) throw new Error(`Fragment ${fragmentId} not found in message ${msg.id}`);
    
    if (fragment.contentType !== MessageContentType.Text) throw new Error("Fragment is not text type");

    if (useChoices) {
        throw new Error("Choices are not supported yet");
    }
    else {
        const choice = chunk.choices[0];
        if (!choice) return null;
        const fragType = GetResponseChunkFragmentType(chunk, 0);
        if (!fragType) return null;
        switch (fragType) {
            case MessageFragmentType.Think:
                fragment.content += String((choice.delta as any).reasoning_content);
                break;
            case MessageFragmentType.Response:
                fragment.content += choice.delta.content;
                break;
            default: ;
        }
        return true;
    }
}

// --------

export function ExtractMessageText(msg: Message) {
    const res: string[] = [];
    for (const frag of msg.fragments) {
        if (frag.contentType !== MessageContentType.Text) continue;
        res.push(frag.content);
    }
    return res.join("\n\n---\n\n");
}

