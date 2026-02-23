// adapter for other Gemini-compatible providers
import type { Conversation } from "@/types/conversation";
import { MessageFeatureType, type Message } from "@/types/message";
import { _base_stream } from "../common";
import { GetProviderUrl } from "../provider";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message, afterOpen?: (resp: Response) => void) {
    return await _base_stream(conv, reqMsg, respMsg, {
        buildRequestUrl: async (req, conv, reqMsg, respMsg, prov, model) => {
            return GetProviderUrl(prov) + `${model.id}:streamGenerateContent?alt=sse`;
        },
        buildRequestHeaders: async (req, conv, reqMsg, respMsg, prov, model) => ({
            "x-goog-api-key": prov.api_key,
            "accept": "text/event-stream",
            "content-type": "application/json",
        }),
        onBeforeRequest: async (req, conv, reqMsg, respMsg, prov, model) => {
            if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
                case MessageFeatureType.Thinking:
                    // unknown platform, we don't know how to add reasoning params
                    // if you want to enable thinking, you should create a custom adapter
                    break;
                default: ; // ignore unknown feature type
            }
        },
        onOpened: async (req, resp, conv, reqMsg, respMsg, providerInfo, modelInfo) => {
            if (afterOpen) await afterOpen(resp);
        },
    });
}
