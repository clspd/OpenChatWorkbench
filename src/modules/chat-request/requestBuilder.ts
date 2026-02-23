import { cloneDeep } from "lodash-es";
import { useAppStatePersistStore } from "@/stores/appStatePersist";
import type { Conversation } from "@/types/conversation";
import { MessageContentType, MessageFragmentType, MessageRole, type Message } from "@/types/message";
import type { ChatCompletionMessageParam, ChatCompletionContentPart, ChatCompletionContentPartText } from "openai/resources";
import { GetAttachmentById, MAX_POSSIBLE_MESSAGE_FILES_TOTAL_SIZE, MAX_POSSIBLE_TEXT_CONTENT_FILE_SIZE } from "../chat/attachment";

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
    includeSystem: boolean;
    includeAssistant: boolean;
    includeUser: boolean;
    includeThinking: boolean;
    stringOnly: boolean;
}

export const RequestBuilderDefaultConfig: RequestBuilderConfig = {
    includeSystem: true,
    includeAssistant: true,
    includeUser: true,
    includeThinking: false,
    stringOnly: false,
}

// trace message chain and generate OpenAI-API Compatible Request Messages array
export async function BuildOpenAICompatibleRequestMessages(conv: Conversation, tailNodeId: number, config?: RequestBuilderConfig) {
    if (!config) {
        const defaultConfig = useAppStatePersistStore().defaultBuilderConfig ?? RequestBuilderDefaultConfig;
        config = defaultConfig;
    }
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
                if (!config.includeUser) break;
                result.push({
                    role: Ocw2OaiMap.role[msg.role],
                    content: await BuildOpenAICompatibleRequestMessageContent(msg, config),
                });
                break;
            case MessageRole.System:
                if (!config.includeSystem) break;
                // [[fallthrough]]
            case MessageRole.Assistant:
                if (msg.role === MessageRole.Assistant && !config.includeAssistant) break;
                result.push({
                    role: Ocw2OaiMap.role[msg.role],
                    content: await BuildOpenAICompatibleRequestMessageContent_TextOnly(msg, config),
                });
                break;
            
            default:
                throw new Error("Unknown message role");
        }
    }

    // reverse result to make it in chronological order
    return result.reverse();
}

function blobToDataURL(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

export async function IntegrateMessageFilesToContext(msg: Message, config: RequestBuilderConfig) {
    const result: ChatCompletionContentPart[] = [];
    // 1st round: check file size
    let totalSize = 0;
    for (const f of msg.files) {
        if (f.type.startsWith("image/")) continue;
        totalSize += f.size;
    }
    if (totalSize > MAX_POSSIBLE_MESSAGE_FILES_TOTAL_SIZE) throw new Error(`Total size of files (${totalSize} bytes) exceeds max allowed size (${MAX_POSSIBLE_MESSAGE_FILES_TOTAL_SIZE} bytes)`);
    // 2nd round: add data
    for (const f of msg.files) try {
        const fileContent = await GetAttachmentById(f.id);
        if (f.type.startsWith("image/")) {
            if (config.stringOnly) throw new Error("The message includes image content but stringOnly is set");
            result.push({
                type: "image_url",
                image_url: {
                    url: await blobToDataURL(fileContent),
                },
            });
        }
        else if (fileContent.size < MAX_POSSIBLE_TEXT_CONTENT_FILE_SIZE) {
            result.push({
                type: "text",
                text: `<file>\n<name>${f.name}</name>\n<content>\n${await fileContent.text()}\n</content>\n</file>`,
            });
        }
        else throw new Error(`File ${f.name} is too large (${fileContent.size} bytes), max allowed size is ${MAX_POSSIBLE_TEXT_CONTENT_FILE_SIZE} bytes`);
    } catch (e) {
        result.push({
            type: "text",
            text: `<file>\n<name>${f.name}</name>\n<error>${e}</error>\n</file>`,
        });
    }
    return result;
}

// build content from message fragments
export async function BuildOpenAICompatibleRequestMessageContent(msg: Message, config: RequestBuilderConfig, prefersString = true) {
    const isTextOnly = msg.fragments.every(f => f.contentType === MessageContentType.Text) && msg.files.every(f => !f.type.startsWith("image/"));
    if (prefersString && isTextOnly) return BuildOpenAICompatibleRequestMessageContent_TextOnly(msg, config);
    if (!isTextOnly && config.stringOnly) throw new Error("The message includes non-text content but stringOnly is set");
    const result: ChatCompletionContentPart[] = [];
    // add files first
    result.push(...await IntegrateMessageFilesToContext(msg, config));
    // add message fragments
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
export async function BuildOpenAICompatibleRequestMessageContent_TextOnly(msg: Message, config: RequestBuilderConfig): Promise<string> {
    // retrieve message fragments to build content
    const result: string[] = []; // for compatibility (OpenAI API supports types, but some 3p-providers don't)
    // add files first
    result.push(...(await IntegrateMessageFilesToContext(msg, Object.assign(cloneDeep(config), {
        stringOnly: true,
    }))).map(f => (f as ChatCompletionContentPartText).text));
    // add message fragments
    for (const f of msg.fragments) {
        switch (f.type) {
            case MessageFragmentType.Think:
                if (!config.includeThinking) break;
                result.push(`<think>\n${f.content}\n</think>`);
                break;
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

