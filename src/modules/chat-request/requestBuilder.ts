import type { Conversation } from "@/types/conversation";
import { MessageContentType, MessageFragmentType, MessageRole, type Message } from "@/types/message";
import type { ChatCompletionMessageParam, ChatCompletionContentPart, ChatCompletionContentPartText } from "openai/resources";

export class ConvCircularReferenceError extends TypeError {
    constructor(message = "The conversation contains a Circular Reference", options?: any) {
        super(message, options);
    }
}

export class ConvInvalidReferenceError extends TypeError {
    constructor(message = "The conversation contains an invalid reference", options?: any) {
        super(message, options);
    }
}

// Convert Open Chat Workbench data structure to OpenAI-API Compatible
export const Ocw2OaiMap = {
    role: {
        [MessageRole.User]: "user" as const,
        [MessageRole.Assistant]: "assistant" as const,
        [MessageRole.System]: "system" as const,
    },
}

export interface RequestBuilderConfig {
    includeThinking: boolean;
    stringOnly: boolean;
}

export const RequestBuilderDefaultConfig: RequestBuilderConfig = {
    includeThinking: false,
    stringOnly: false,
}

// trace message chain and generate OpenAI-API Compatible Request Messages array
export function BuildOpenAICompatibleRequestMessages(conv: Conversation, tailNodeId: number, config: RequestBuilderConfig = RequestBuilderDefaultConfig) {
    const result: ChatCompletionMessageParam[] = [];
    const messageId2IndexMap = new Map<number, number>();

    // convert message id to array index
    {
        let n = 0;
        for (const i of conv.messages) {
            messageId2IndexMap.set(i.id, n++);
        }
    }

    // retrieve message chain
    const indexOrder: number[] = [];
    let currentIndex = messageId2IndexMap.get(tailNodeId);
    if (currentIndex === undefined) throw new Error("The tail node specified does not exist.");
    while (currentIndex !== undefined) {
        if (indexOrder.includes(currentIndex)) throw new ConvCircularReferenceError();
        indexOrder.push(currentIndex);
        const msg: Message | undefined = conv.messages[currentIndex];
        if (!msg) throw new ConvInvalidReferenceError();
        currentIndex = msg.parent_id == null ? undefined : messageId2IndexMap.get(msg.parent_id);

        // save to result
        switch (msg.role) {
            case MessageRole.User:
                result.push({
                    role: Ocw2OaiMap.role[msg.role],
                    content: BuildOpenAICompatibleRequestMessageContent(msg, config),
                });
                break;
            case MessageRole.Assistant:
            case MessageRole.System:
                result.push({
                    role: Ocw2OaiMap.role[msg.role],
                    content: BuildOpenAICompatibleRequestMessageContent_TextOnly(msg, config),
                });
                break;
            
            default:
                throw new Error("Unknown message role");
        }
    }

    // reverse result to make it in chronological order
    return result.reverse();
}

// build content from message fragments
export function BuildOpenAICompatibleRequestMessageContent(msg: Message, config: RequestBuilderConfig, prefersString = true) {
    const isTextOnly = msg.fragments.every(f => f.contentType === MessageContentType.Text);
    if (prefersString && isTextOnly) return BuildOpenAICompatibleRequestMessageContent_TextOnly(msg, config);
    if (!isTextOnly && config.stringOnly) throw new Error("The message includes non-text content but stringOnly is set");
    const result: ChatCompletionContentPart[] = [];
    for (const f of msg.fragments) {
        switch (f.contentType) {
            case MessageContentType.Text:
                if (f.type === MessageFragmentType.Think && !config.includeThinking) break;
                result.push({
                    type: "text",
                    text: f.content,
                });
                break;
            // for future extensions
            default: ;
        }
    }
    if (isTextOnly) return result as ChatCompletionContentPartText[];
    else return result;
}

// build content string from message fragments (text only)
export function BuildOpenAICompatibleRequestMessageContent_TextOnly(msg: Message, config: RequestBuilderConfig): string {
    // retrieve message fragments to build content
    const result: string[] = []; // for compatibility (OpenAI API supports types, but some 3p-providers don't)
    for (const f of msg.fragments) {
        switch (f.type) {
            case MessageFragmentType.Think:
                if (!config.includeThinking) break; 
                // [[fallthrough]]
            case MessageFragmentType.Request:
            case MessageFragmentType.Response:
                if (f.contentType !== MessageContentType.Text) throw new Error("Non-text message has been provided to text-only builder");
                result.push(f.content);
                break;
            default: ;
        }
    }
    return result.length === 1 ? result[0]! : result.join("\n\n---\n\n");
}

