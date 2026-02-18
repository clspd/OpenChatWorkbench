// message.ts: functions about message management
import { MessageContentType, MessageFragmentType, MessageStatus, type FileAttachmentInfo, type Message, type MessageContent, type MessageFeatureItem, type MessageRole } from "@/types/message";
import type { ChatCompletionChunk } from "openai/resources";

/**
 * Create a user message.
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

// TODO: export const CreateUserMessageEx

// There is no
// export const CreateAssistantMessage
// because assistant message should be added by respond module, not data module.

// --------

export async function AppendMessageFragmentChunk(msg: Message, fragmentId: number, chunk: ChatCompletionChunk, useChoices = false) {
    const fragment = msg.fragments.find(f => f.id === fragmentId);
    if (!fragment) throw new Error(`Fragment ${fragmentId} not found in message ${msg.id}`);
    
    if (fragment.contentType !== MessageContentType.Text) throw new Error("Fragment is not text type");

    if (useChoices) {
        throw new Error("Choices are not supported yet");
    }
    else {
        const choice = chunk.choices[0];
        if (!choice) return null;
        if (typeof (choice.delta as any).reasoning_content === 'string') {
            fragment.content += String((choice.delta as any).reasoning_content);
        }
        else if (choice.delta.content) {
            fragment.content += choice.delta.content;
        }
        return true;
    }
}

