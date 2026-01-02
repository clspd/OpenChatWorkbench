import { MessageRole, MessageStatus, MessageFeedback } from '@/types/index.ts';
import type { Message, MessageFragment, Conversation } from '@/types/index.ts';
import { saveConversation } from './conversation';

// 创建新消息
export function createMessage(
    conversation: Conversation,
    role: MessageRole,
    model: string,
    provider: string,
    providerName: string,
    parentId: number | null = null,
    status: MessageStatus = MessageStatus.FINISHED
): Message {
    // 生成新消息ID（最大ID + 1）
    const maxId = Math.max(0, ...conversation.messages.map(msg => msg.id));
    const newId = maxId + 1;

    const message: Message = {
        id: newId,
        parent_id: parentId,
        accumulated_token_usage: 0,
        model: model,
        provider: provider,
        providerName: providerName,
        thinking_enabled: false,
        role: role,
        feedback: MessageFeedback.NOT_PROVIDED,
        status,
        files: [],
        fragments: [],
        has_pending_fragment: false
    };

    conversation.messages.push(message);
    return message;
}

// 创建新消息片段
export function createMessageFragment(
    message: Message,
    type: "REQUEST" | "THINK" | "RESPONSE",
    content: string,
    elapsed: number = 0
): MessageFragment {
    // 生成新片段ID（最大ID + 1）
    const maxId = Math.max(0, ...message.fragments.map(frag => frag.id));
    const newId = maxId + 1;

    const fragment: MessageFragment = {
        id: newId,
        type: type,
        elapsed: elapsed,
        content: content
    };

    message.fragments.push(fragment);
    return fragment;
}

// 更新消息状态
export async function updateMessageStatus(
    conversation: Conversation,
    messageId: number,
    status: MessageStatus
): Promise<void> {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (message) {
        message.status = status;
        await saveConversation(conversation);
    }
}

// 更新消息反馈
export async function updateMessageFeedback(
    conversation: Conversation,
    messageId: number,
    feedback: MessageFeedback
): Promise<void> {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (message) {
        message.feedback = feedback;
        await saveConversation(conversation);
    }
}

// 添加文件附件
export async function addFileAttachment(
    conversation: Conversation,
    messageId: number,
    fileId: string,
    fileName: string
): Promise<void> {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (message) {
        message.files.push({
            id: fileId,
            name: fileName
        });
        await saveConversation(conversation);
    }
}

// 设置消息思考模式
export async function setThinkingEnabled(
    conversation: Conversation,
    messageId: number,
    enabled: boolean
): Promise<void> {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (message) {
        message.thinking_enabled = enabled;
        await saveConversation(conversation);
    }
}

// 更新消息令牌使用量
export async function updateTokenUsage(
    conversation: Conversation,
    messageId: number,
    usage: number
): Promise<void> {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (message) {
        message.accumulated_token_usage = usage;
        await saveConversation(conversation);
    }
}

// 获取最新消息
export function getLatestMessage(conversation: Conversation): Message | undefined {
    if (conversation.messages.length === 0) {
        return undefined;
    }

    // 按ID降序排序，返回第一个（最新的）
    return [...conversation.messages].sort((a, b) => b.id - a.id)[0];
}

// 获取特定角色的消息
export function getMessagesByRole(conversation: Conversation, role: MessageRole): Message[] {
    return conversation.messages.filter(msg => msg.role === role);
}

// 删除消息
export async function deleteMessage(conversation: Conversation, messageId: number): Promise<void> {
    const index = conversation.messages.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
        conversation.messages.splice(index, 1);
        await saveConversation(conversation);
    }
}

// 发送用户消息（整合函数）
export async function sendUserMessage(
    conversation: Conversation,
    content: string,
    model: string,
    provider: string,
    providerName: string
): Promise<Message> {
    // 创建用户消息
    const message = createMessage(conversation, MessageRole.USER, model, provider, providerName);

    // 创建请求片段
    createMessageFragment(message, "REQUEST", content);

    // 保存对话
    await saveConversation(conversation);

    return message;
}
