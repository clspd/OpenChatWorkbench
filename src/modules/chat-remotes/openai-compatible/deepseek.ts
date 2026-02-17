// adapter for other OpenAI-compatible providers

import { useConfigStore } from "@/stores/configStore";
import type { Conversation, PendingMessageRequest } from "@/types/conversation";
import { MessageContentType, MessageFeatureType, MessageFragmentType, MessageStatus, type Message, type MessageFragment } from "@/types/message";
import { BuildOpenAICompatibleRequestMessages } from "@/modules/chat-request/requestBuilder";
import type { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from "openai/resources";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { GetProviderUrl, GetResponseChunkFragmentType } from "../provider";
import { useConversationStore } from "@/stores/conversationStore";
import { AppendMessageFragmentChunk } from "@/modules/chat/message";

export async function stream(conv: Conversation, reqMsg: Message, respMsg: Message) {
    const conversationStore = useConversationStore();

    // get model and provider info
    const provider = respMsg.provider;
    const model = respMsg.model;
    if (!model || !provider) throw new Error("model and provider are required");

    // get request URL
    const providerInfo = useConfigStore().getProviderById(provider);
    if (!providerInfo) throw new Error("provider not found");

    // build request JSON
    const req: ChatCompletionCreateParamsStreaming = {
        model: model,
        messages: BuildOpenAICompatibleRequestMessages(
            conv,
            reqMsg.id,
            // config
        ),
        stream: true,
    };

    // process features
    if (respMsg.features) for (const i of respMsg.features) switch (i.type) {
        case MessageFeatureType.Thinking:
            // reference: https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
            if (i.value === true) (req as any).thinking = { type: 'enabled' };
            break;
        default: ; // ignore unknown feature type
    }

    // create an ongoing request data and save to store
    const cancelToken = new AbortController();
    const pendingReq: PendingMessageRequest = {
        convId: conv.id,
        reqId: reqMsg.id,
        respId: respMsg.id,
        opened: false,
        cancelToken,
    };
    if (conversationStore.requestsInProgress.has(conv.id))
        throw new Error("There is an ongoing request for this conversation");
    conversationStore.requestsInProgress.set(conv.id, pendingReq);

    let currentFragment: MessageFragment | null = null;
    let lastResponseChunkType: MessageFragmentType | null = null;
    
    // send request.
    try {
        await fetchEventSource(new Request(new URL(GetProviderUrl(providerInfo))), {
            method: "POST",
            headers: {
                "authorization": `Bearer ${providerInfo.api_key}`,
                "accept": "text/event-stream",
                "content-type": "application/json",
            },
            body: JSON.stringify(req),
            signal: cancelToken.signal,
            openWhenHidden: true,

            async onopen(response) {
                if (!response.ok) {
                    const text = await response.clone().text();

                    throw new Error(`Remote API Error: ${response.status} ${response.statusText}\n\n${text}`);
                }
                const ct = response.headers.get('content-type') || '';
                if (!ct.startsWith('text/event-stream'))
                    throw new Error("Server returned unexpected content type: " + ct);

                pendingReq.opened = true;
            },

            onerror(err) {
                throw new Error("Unexpected error during streaming response", { cause: err });
            },

            onclose() {
                respMsg.has_pending_fragment = false;
                conversationStore.updateConvInStore(conv.id, conv);
            },

            onmessage(ev) {
                const data = ev.data;
                if (!data || data === '[DONE]') return;

                try {
                    const json = JSON.parse(data) as ChatCompletionChunk;
                    if (json.object !== "chat.completion.chunk") throw new TypeError("Unexpected object type in streaming response: " + json.object);

                    // distinct reasoning content from content
                    const type = GetResponseChunkFragmentType(json, 0);
                    if (type !== lastResponseChunkType) {
                        lastResponseChunkType = type;
                        currentFragment = type ? {
                            id: respMsg.fragments.length + 1,
                            type: type,
                            contentType: MessageContentType.Text,
                            content: "",
                        } : null;
                        if (currentFragment) respMsg.fragments.push(currentFragment);
                    }

                    // append data
                    if (currentFragment) {
                        AppendMessageFragmentChunk(respMsg, currentFragment.id, json, false);
                        conversationStore.updateConvInStore(conv.id, conv);
                    }
                }
                catch (err) {
                    throw new Error("Error parsing streaming response", { cause: err });
                }
            },
        });

        // update conversation status
        respMsg.status = MessageStatus.Finished;
    }
    catch (err) {
        respMsg.status = MessageStatus.Error;
        respMsg.has_pending_fragment = false;
    }
    finally {
        // update conversation status
        conversationStore.updateConvInStore(conv.id, conv);
        // remove the pending request data from store
        conversationStore.requestsInProgress.delete(conv.id);
    }
}
