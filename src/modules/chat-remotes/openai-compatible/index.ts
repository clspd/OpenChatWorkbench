import type { Conversation } from "@/types/conversation";
import type { MessageFeatureItem, FileAttachmentInfo, Message } from "@/types/message";

export const MessageStreamer = {
    other: async () => (await import('./other')).stream,
    "api.openai.com": async () => (await import('./openai')).stream,
    "api.deepseek.com": async () => (await import('./deepseek')).stream,
} as Record<string, () => Promise<(
    conv: Conversation,
    req: Message,
    resp: Message,
    afterOpen?: (resp: Response) => void,
) => Promise<void>>>;
