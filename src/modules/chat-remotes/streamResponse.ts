// modules/chat-remotes/index.ts: remote chat service
import type { Conversation } from "@/types/conversation";
import { MessageFeedback, MessageRole, MessageStatus, type FileAttachmentInfo, type Message, type MessageFeatureItem } from "@/types/message";
import { MessageStreamer } from "./streamer";
import type { ModelConfig, ProviderConfig } from "@/types/config";
import { useConversationStore } from "@/stores/conversationStore";
import { GetProviderUrl } from "./provider";
import { reactive } from "vue";
import { GetConvNextMessageId, UpdateConversationInfo } from "../chat/conversation";

export async function streamResponse(
    conv: Conversation,
    reqId: number,
    provider: ProviderConfig,
    model: ModelConfig,
    features: MessageFeatureItem[],
    files: FileAttachmentInfo[],
    onCreated?: (msg: Message) => void | Promise<void>,
): Promise<number> {
    // check if there is an ongoing request
    if (useConversationStore().requestsInProgress.has(conv.id))
        throw new Error("There is an ongoing request for this conversation");

    // get request info
    const req = conv.messages.find((m) => m.id === reqId);
    if (!req) throw new Error('Request message specified by ID is not in conversation');

    // create message object
    const msg: Message = reactive({
        id: await GetConvNextMessageId(conv.id),
        parent_id: reqId,
        role: MessageRole.Assistant,
        status: MessageStatus.WIP,
        ts: Date.now(),
        feedback: MessageFeedback.NotProvided,
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        features,
        files: [], // this is an assistant message; files should only appear in user message
        fragments: [],
        has_pending_fragment: true,
        usage: {
            total_tokens: 0,
        },
    });

    // update conversation
    conv.messages.push(msg);
    UpdateConversationInfo(conv.id);
    useConversationStore().updateConvInStore(conv.id, conv);
    if (onCreated) await onCreated(msg);

    // create stream
    const providerUrl = GetProviderUrl(provider);
    const providerHostname = (() => {
        try {
            const url = new URL(providerUrl);
            return url.hostname;
        }
        catch {
            throw new TypeError("Invalid provider config: Provider URL is not a URL");
        }
    })();

    try {
        const streamer = await (
            MessageStreamer[providerHostname + "_" + provider.compatibilityMode] ??
            MessageStreamer[providerHostname] ??
            MessageStreamer["other-" + provider.compatibilityMode] ??
            MessageStreamer["other-openai"]!
        )();
        await streamer(conv, req, msg);
    }
    catch (e) {
        throw new Error("Failed to stream response", { cause: e });
    }
    return msg.id;
}

