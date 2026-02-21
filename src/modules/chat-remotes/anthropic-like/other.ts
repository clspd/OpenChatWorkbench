// adapter for other Anthropic-compatible providers
import type { Conversation } from "@/types/conversation";
import { MessageContentType, MessageFeatureType, MessageFragmentType, type Message, type MessageFragment } from "@/types/message";
import { _base_stream } from "../common";
import { GetProviderUrl, GetResponseChunkFragmentType } from "../provider";
import { AppendMessageFragmentChunk } from "@/modules/chat/message";
import { useConversationStore } from "@/stores/conversationStore";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message, afterOpen?: (resp: Response) => void) {
    // In Anthropic API, we don't need to manually maintain the state
    // since the response has a `index` field to indicate the order of the chunk
    // See also: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
    const base_offset = respMsg.fragments.length;
    let modelId: string | null = respMsg.model || null;
    return await _base_stream(conv, reqMsg, respMsg, {
        buildRequestUrl: async (req, conv, reqMsg, respMsg, prov, mode) => {
            return GetProviderUrl(prov);
        },
        buildRequestHeaders: async (req, conv, reqMsg, respMsg, prov, mode) => ({
            "x-api-key": prov.api_key,
            "accept": "text/event-stream",
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
        }),
        onBeforeRequest: async (req, conv, reqMsg, respMsg, prov, mode) => {
            if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
                case MessageFeatureType.Thinking:
                    if (i.value === true) (req as any).thinking = { type: 'enabled' };
                    break;
                default: ; // ignore unknown feature type
            }
        },
        onOpened: async (req, resp, conv, reqMsg, respMsg, providerInfo, modelInfo) => {
            if (afterOpen) afterOpen(resp);
        },
        onChunk(req, chunk, conv, reqMsg, respMsg, provider, model) {
            switch (chunk.type) {
                case "message_start":
                    if (chunk.message?.model) modelId = chunk.message.model;
                    break;
                case "message_delta":
                case "message_stop":
                case "content_block_stop":
                    // We're not interested in this chunk
                    break;
                case "content_block_start":
                    // create a new fragment
                    if (Number.isNaN(chunk.index))
                        throw new TypeError("Cannot parse content block index");
                    respMsg.fragments[base_offset + chunk.index] = {
                        id: chunk.index.toString(),
                        type: (
                            chunk.delta.type === "thinking" ?
                                MessageFragmentType.Think :
                                MessageFragmentType.Response
                        ),
                        content: "",
                        contentType: MessageContentType.Text,
                    };
                    break;
                case "content_block_delta":
                    // append content to the fragment
                    if (Number.isNaN(chunk.index))
                        throw new TypeError("Cannot parse content block index");
                    AppendMessageFragmentChunk(respMsg, base_offset + chunk.index, {
                        choices: [{
                            delta: {
                                content: chunk.delta.text,
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
                default:
                    throw new TypeError("Unexpected object type in streaming response: " + chunk.type);
            }
        },
    });
}
