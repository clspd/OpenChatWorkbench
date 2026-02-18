// adapter for other OpenAI-compatible providers
import type { Conversation } from "@/types/conversation";
import { MessageFeatureType, type Message } from "@/types/message";
import { _base_stream } from "./common";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message) {
    return await _base_stream(conv, reqMsg, respMsg, {
        buildRequestHeaders: async (req, conv, reqMsg, respMsg, prov, mode) => ({
            "authorization": `Bearer ${prov.api_key}`,
            "accept": "text/event-stream",
            "content-type": "application/json",
        }),
        onBeforeRequest: async (req, conv, reqMsg, respMsg, prov, mode) => {
            if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
                case MessageFeatureType.Thinking:
                    // unknown platform, we don't know how to add reasoning params
                    // if you want to enable thinking, you should create a custom adapter
                    break;
                default: ; // ignore unknown feature type
            }
        },
    });
}
