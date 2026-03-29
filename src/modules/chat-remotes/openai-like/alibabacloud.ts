// adapter for Alibaba Cloud (Aliyun)
import type { Conversation } from "@/types/conversation";
import { MessageFeatureType, type Message } from "@/types/message";
import { _base_stream } from "../common";
import { GetProviderUrl } from "../provider";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message, afterOpen?: (resp: Response) => void) {
    return await _base_stream(conv, reqMsg, respMsg, {
        buildRequestUrl: async (req, conv, reqMsg, respMsg, prov, mode) => {
            return GetProviderUrl(prov);
        },
        buildRequestHeaders: async (req, conv, reqMsg, respMsg, prov, mode) => ({
            "authorization": `Bearer ${prov.api_key}`,
            "accept": "text/event-stream",
            "content-type": "application/json",
        }),
        onBeforeRequest: async (req, conv, reqMsg, respMsg, prov, mode) => {
            if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
                case MessageFeatureType.Thinking:
                    if (i.value === true) {
                        (req as any).enable_thinking = true;
                    }
                    break;
                default: ; // ignore unknown feature type
            }
        },
        onOpened: async (req, resp, conv, reqMsg, respMsg, providerInfo, modelInfo) => {
            if (afterOpen) await afterOpen(resp);
        },
    });
}
