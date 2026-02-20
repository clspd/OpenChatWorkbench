// modules/chat-remotes/index.ts: remote chat service
import type { Conversation } from "@/types/conversation";
import { MessageFeedback, MessageRole, MessageStatus, type FileAttachmentInfo, type Message, type MessageFeatureItem } from "@/types/message";
import { MessageStreamer } from "./openai-compatible";
import type { ModelConfig, ProviderConfig } from "@/types/config";
import { useConversationStore } from "@/stores/conversationStore";
import { GetProviderUrl } from "./provider";
import { reactive } from "vue";

export async function streamResponse(
    conv: Conversation,
    reqId: number,
    provider: ProviderConfig,
    model: ModelConfig,
    features: MessageFeatureItem[],
    files: FileAttachmentInfo[],
    afterOpen?: (resp: Response) => void,
): Promise<number> {
    // check if there is an ongoing request
    if (useConversationStore().requestsInProgress.has(conv.id))
        throw new Error("There is an ongoing request for this conversation");

    // get request info
    const req = conv.messages.find((m) => m.id === reqId);
    if (!req) throw new Error('Request message specified by ID is not in conversation');

    // create message object
    const msg: Message = reactive({
        id: reqId + 1, // response id
        parent_id: reqId,
        role: MessageRole.Assistant,
        status: MessageStatus.WIP,
        feedback: MessageFeedback.NotProvided,
        provider: provider.id,
        providerName: provider.name,
        model: model.id,
        features,
        files,
        fragments: [],
        has_pending_fragment: true,
        usage: {
            total_tokens: 0,
        },
    });

    // update conversation
    conv.messages.push(msg);
    useConversationStore().updateConvInStore(conv.id, conv);

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
        const streamer = await (MessageStreamer[providerHostname] ?? MessageStreamer["other"]!)();
        await streamer(conv, req, msg, afterOpen);
    }
    catch (e) {
        throw new Error("Failed to stream response", { cause: e });
    }
    return msg.id;
}

