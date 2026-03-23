// adapter for other Anthropic-compatible providers
import type { Conversation } from "@/types/conversation";
import { MessageContentType, MessageFeatureType, MessageFragmentType, type Message, type MessageFragment } from "@/types/message";
import { _base_stream, APIError } from "../common";
import { GetProviderUrl, GetResponseChunkFragmentType } from "../provider";
import { AppendMessageFragmentChunk } from "@/modules/chat/message";
import { useConversationStore } from "@/stores/conversationStore";
import { BuildOpenAICompatibleRequestMessages } from "@/modules/chat-request/requestBuilder";
import { useAppStatePersistStore } from "@/stores/appStatePersist";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message, afterOpen?: (resp: Response) => void) {
    // In Anthropic API, we don't need to manually maintain the state
    // since the response has a `index` field to indicate the order of the chunk
    // See also: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
    const base_offset = respMsg.fragments.length + 1;
    let modelId: string | null = respMsg.model || null;
    const startTs = Date.now();
    return await _base_stream(conv, reqMsg, respMsg, {
        buildRequestUrl: async (req, conv, reqMsg, respMsg, prov, model) => {
            return GetProviderUrl(prov);
        },
        buildRequestHeaders: async (req, conv, reqMsg, respMsg, prov, model) => ({
            "x-api-key": prov.api_key,
            "accept": "text/event-stream",
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
        }),
        buildRequest: async (conv, reqMsg, respMsg, provider, model) => ({
            model: model.id,
            messages: await BuildOpenAICompatibleRequestMessages(conv, reqMsg.id, {
                stringOnly: true,
                includeSystem: false,
                includeAssistant: true,
                includeUser: true,
                includeThinking: useAppStatePersistStore().defaultBuilderConfig.includeThinking,
            }),
            system: (await BuildOpenAICompatibleRequestMessages(conv, respMsg.id, {
                stringOnly: true,
                includeThinking: false,
                includeSystem: true,
                includeAssistant: false,
                includeUser: false,
            }))[0]?.content ?? undefined,
            stream: true,
        }),
        onBeforeRequest: async (req, conv, reqMsg, respMsg, prov, model) => {
            if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
                case MessageFeatureType.Thinking:
                    if (i.value === true) (req as any).thinking = { type: 'enabled' };
                    break;
                default: ; // ignore unknown feature type
            }
            const v = respMsg.features?.find(i => i.type === MessageFeatureType.MaxTokensLimit)?.value;
            (req as any).max_tokens = typeof v === 'number' ? v : 8192;
        },
        onOpened: async (req, resp, conv, reqMsg, respMsg, providerInfo, modelInfo) => {
            if (afterOpen) await afterOpen(resp);
        },
        onChunk(req, chunk, conv, reqMsg, respMsg, provider, model) {
            switch (chunk.type) {
                case "message_start":
                    if (chunk.message?.model) modelId = chunk.message.model;
                    break;
                case "message_delta":
                case "message_stop":
                case "ping":
                    // We're not interested in this chunk
                    break;
                case "content_block_start":
                    // create a new fragment
                    if (Number.isNaN(chunk.index))
                        throw new TypeError("Cannot parse content block index");
                    respMsg.fragments.push({
                        id: base_offset + chunk.index,
                        ts: Date.now(),
                        type: (
                            chunk.content_block?.type === "thinking" ?
                                MessageFragmentType.Think :
                                MessageFragmentType.Response
                        ),
                        content: "",
                        contentType: MessageContentType.Text,
                        elapsed: 0,
                        first_token_latency: (chunk.index === 0) ? (Date.now() - startTs) : undefined,
                    });
                    break;
                case "content_block_delta":
                    // append content to the fragment
                    if (Number.isNaN(chunk.index))
                        throw new TypeError("Cannot parse content block index");
                    AppendMessageFragmentChunk(respMsg, base_offset + chunk.index, {
                        choices: [{
                            delta: {
                                content: (chunk.delta?.type === "thinking_delta" ? chunk.delta.thinking : chunk.delta?.text) || "",
                            },
                            finish_reason: null,
                            index: chunk.index,
                        }],
                        id: chunk.index.toString(),
                        object: "chat.completion.chunk",
                        created: Date.now(),
                        model: model.id,
                    });
                    useConversationStore().updateConvInStore(conv.id, conv);
                    break;
                case "content_block_stop":
                    // update elapsed time
                    if (Number.isNaN(chunk.index))
                        throw new TypeError("Cannot parse content block index");
                    const frag = respMsg.fragments.find(f => f.id === base_offset + chunk.index);
                    if (frag) {
                        frag.elapsed = Date.now() - frag.ts;
                        useConversationStore().updateConvInStore(conv.id, conv);
                    }
                    else {
                        console.warn("[adapters/anthropic-like]", "Cannot find fragment for content block stop event: ", chunk);
                    }
                    break;
                case 'error':
                    throw new APIError("Remote API returned an error: " + JSON.stringify(chunk));
                default:
                    // throw new TypeError("Unexpected object type in streaming response: " + chunk.type);
            }
        },
    });
}
