import type { Conversation } from "@/types/conversation";
import type { MessageFeatureItem, FileAttachmentInfo, Message } from "@/types/message";

export const MessageStreamer = {
    "other-openai": async () => (await import('./openai-like/other')).stream,
    "other-claude": async () => (await import('./anthropic-like/other')).stream,
    "other-gemini": async () => (await import('./gemini-like/gemini')).stream,
    "api.openai.com": async () => (await import('./openai-like/openai')).stream,
    "api.deepseek.com_openai": async () => (await import('./openai-like/deepseek')).stream,
    "api-inference.modelscope.cn_openai": async () => (await import('./openai-like/alibabacloud')).stream,
    "dashscope.aliyuncs.com_openai": async () => (await import('./openai-like/alibabacloud')).stream,
    "dashscope-intl.aliyuncs.com_openai": async () => (await import('./openai-like/alibabacloud')).stream,
    "dashscope-us.aliyuncs.com_openai": async () => (await import('./openai-like/alibabacloud')).stream,
    "dashscope-finance.aliyuncs.com_openai": async () => (await import('./openai-like/alibabacloud')).stream,
} as Record<string, () => Promise<(
    conv: Conversation,
    req: Message,
    resp: Message,
    afterOpen?: (resp: Response) => void,
) => Promise<void>>>;
