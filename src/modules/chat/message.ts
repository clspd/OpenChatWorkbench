// message.ts: functions about message management
import { MessageStatus, type FileAttachmentInfo, type Message, type MessageContent, type MessageFeatureItem, type MessageRole } from "@/types/message";

/**
 * Create a user message.
 */
export const CreateUserMessage = (
    id: number,
    parent_id: number | null,
    role: MessageRole,
    content: MessageContent,
    files: FileAttachmentInfo[] = [],
): Message => ({
    id,
    parent_id,
    role,
    status: MessageStatus.FINISHED,
    files,
    fragments: [
        {
            id: 0,
            type: "REQUEST",
            content,
        }
    ],
    has_pending_fragment: false,
});

// There is no
// export const CreateAssistantMessage
// because assistant message should be added by respond module, not data module.


