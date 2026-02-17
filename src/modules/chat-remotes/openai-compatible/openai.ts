// adapter for OpenAI

import { useConfigStore } from "@/stores/configStore";
import type { Conversation, PendingMessageRequest } from "@/types/conversation";
import { MessageContentType, MessageFeatureType, MessageFragmentType, MessageStatus, type Message, type MessageFragment } from "@/types/message";
import { BuildOpenAICompatibleRequestMessages } from "@/modules/chat-request/requestBuilder";
import type { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from "openai/resources";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { GetProviderUrl } from "../provider";
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
            if (i.value === true) req.reasoning_effort = 'high';
            else if (typeof i.value === 'string' && (
                i.value === 'none' ||
                i.value === 'low' ||
                i.value === 'medium' ||
                i.value === 'high'
            )) req.reasoning_effort = i.value;
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

    // OpenAI only outputs content, no reasoning content is provided
    // so it is not possible to show reasoning effort in OpenAI
    const frag: MessageFragment = {
        id: respMsg.fragments.length + 1,
        type: MessageFragmentType.Response,
        contentType: MessageContentType.Text,
        content: "",
    };

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

                // add fragment to message
                respMsg.fragments.push(frag);
                conversationStore.updateConvInStore(conv.id, conv);
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
                    AppendMessageFragmentChunk(respMsg, frag.id, json, false);
                    conversationStore.updateConvInStore(conv.id, conv);
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
