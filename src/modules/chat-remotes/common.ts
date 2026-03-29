// common adapter for OpenAI-compatible providers
// warning: this is a file for internal use and its APIs will change

import { useConfigStore } from "@/stores/configStore";
import type { Conversation, PendingMessageRequest } from "@/types/conversation";
import { MessageContentType, MessageFragmentType, MessageStatus, type Message, type MessageFragment } from "@/types/message";
import { BuildOpenAICompatibleRequestMessages } from "@/modules/chat-request/requestBuilder";
import type { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from "openai/resources";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { GetResponseChunkFragmentType } from "./provider";
import { useConversationStore } from "@/stores/conversationStore";
import { AppendMessageFragmentChunk } from "@/modules/chat/message";
import type { ProviderConfig, ModelConfig } from "@/types/config";
import { TraceErrorAndGetString } from "@/utils/errorTrace";
import { useAppStateStore } from "@/stores/appState";
import { UpdateConversationInfo } from "../chat/conversation";

export type _request_hook_func = (req: ChatCompletionCreateParamsStreaming, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<void>;

export interface _stream_options {
    // called before the request is initialized
    onInitRequest?: (conv: Conversation, reqMsg: Message, respMsg: Message) => Promise<void>,
    // called before the request is sent
    onBeforeRequest?: _request_hook_func,
    // called when the request encounters an error (catch block); if provided, the default handler will be overwritten
    onRequestError?: _request_hook_func,
    // called when the request finishes (after request, within try block); the default handler will never be overwritten
    onRequestFinish?: _request_hook_func,
    // called after the request (finally block); the default handler will never be overwritten
    onAfterRequest?: _request_hook_func,
    // called in onopen; if provided, the default handler will be overwritten
    onOpen?: (req: ChatCompletionCreateParamsStreaming, resp: Response, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<void>,
    // called after onopen
    onOpened?: (req: ChatCompletionCreateParamsStreaming, resp: Response, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<void>,
    // called in onerror; if provided, the default handler will be overwritten
    onError?: (req: ChatCompletionCreateParamsStreaming, err: any, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => void,
    // called in onclose; if provided, the default handler will be overwritten
    onClose?: (req: ChatCompletionCreateParamsStreaming, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => void,
    // called in onmessage; if provided, the default handler will be overwritten
    onChunk?: (req: ChatCompletionCreateParamsStreaming, chunk: any, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => void,
    // build request headers
    buildRequestHeaders: (req: ChatCompletionCreateParamsStreaming, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<Record<string, string>>,
    // build request URL
    buildRequestUrl: (req: ChatCompletionCreateParamsStreaming, conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<string>,
    // build request
    buildRequest?: (conv: Conversation, reqMsg: Message, respMsg: Message, provider: ProviderConfig, model: ModelConfig) => Promise<any>,
}

export class APIError extends TypeError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = "APIError";
    }
}

/**
 * Internal function to stream a request to OpenAI-compatible providers.
 * @param conv The conversation to stream.
 * @param reqMsg The request message.
 * @param respMsg The response message.
 * @param options The stream options.
 */
export async function _base_stream(
    conv: Conversation, reqMsg: Message, respMsg: Message,
    options: _stream_options,
) {
    const conversationStore = useConversationStore();

    // get model and provider info
    const provider = respMsg.provider;
    const model = respMsg.model;
    if (!model || !provider) throw new Error("model and provider are required");

    // get request URL
    const providerInfo = useConfigStore().getProviderById(provider);
    if (!providerInfo) throw new Error("provider not found");
    const modelInfo = useConfigStore().getModel(provider, model);
    if (!modelInfo) throw new Error("model not found");

    // build request JSON
    if (options.onInitRequest) await options.onInitRequest(conv, reqMsg, respMsg);
    const req: ChatCompletionCreateParamsStreaming = options.buildRequest ? await options.buildRequest(conv, reqMsg, respMsg, providerInfo, modelInfo) : {
        model: model,
        messages: await BuildOpenAICompatibleRequestMessages(
            conv,
            reqMsg.id,
            // config
        ),
        stream: true,
    };

    if (options.onBeforeRequest) await options.onBeforeRequest(req, conv, reqMsg, respMsg, providerInfo, modelInfo);

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

    const startFragIdx = respMsg.fragments.length - 1;
    let currentFragment: MessageFragment | null = null;
    let lastResponseChunkType: MessageFragmentType | null = null,
        lastFragIdx = startFragIdx;

    // send request.
    try {
        const startTs = Date.now();
        await fetchEventSource(new Request(new URL(await options.buildRequestUrl(req, conv, reqMsg, respMsg, providerInfo, modelInfo))), {
            method: "POST",
            headers: await options.buildRequestHeaders(req, conv, reqMsg, respMsg, providerInfo, modelInfo),
            body: JSON.stringify(req),
            signal: cancelToken.signal,
            openWhenHidden: true,

            async onopen(response) {
                if (options.onOpen) {
                    await options.onOpen(req, response, conv, reqMsg, respMsg, providerInfo, modelInfo);
                } else {
                    if (!response.ok) {
                        const text = await response.clone().text();

                        throw new APIError(`Remote API Error: ${response.status} ${response.statusText}\n\n${text}`);
                    }
                    const ct = response.headers.get('content-type') || '';
                    if (!ct.startsWith('text/event-stream'))
                        throw new Error("Server returned unexpected content type: " + ct);

                    pendingReq.opened = true;
                }
                await conversationStore.updateConvInStore(conv.id, conv);
                if (options.onOpened) await options.onOpened(req, response, conv, reqMsg, respMsg, providerInfo, modelInfo);
            },

            onerror(err) {
                if (options.onError) options.onError(req, err, conv, reqMsg, respMsg, providerInfo, modelInfo);
                else throw new Error("Unexpected error during streaming response", { cause: err });
            },

            onclose() {
                if (options.onClose) options.onClose(req, conv, reqMsg, respMsg, providerInfo, modelInfo);
                else try {
                    respMsg.has_pending_fragment = false;
                    UpdateConversationInfo(conv.id);
                    conversationStore.updateConvInStore(conv.id, conv);
                } catch (e) {
                    if (!!e && e instanceof Error && (e as any).code === "ENOENT") return; // conversation has been deleted
                    throw e;
                }
            },

            onmessage(ev) {
                const data = ev.data;
                if (!data || data === '[DONE]') return;

                try {
                    const json = JSON.parse(data);
                    if (options.onChunk) {
                        options.onChunk(req, json, conv, reqMsg, respMsg, providerInfo, modelInfo);
                    } else {
                        if (!json.choices && json.error) {
                            throw new APIError("Remote API returned an error", {
                                cause: new TypeError('Remote API returned an error in streaming response', {
                                    cause: JSON.stringify(json.error),
                                })
                            });
                        }

                        if (json.object !== "chat.completion.chunk")
                            //throw new TypeError("Unexpected object type in streaming response: " + json.object);
                            // Some provider just give non-standard response
                            // For most compatibility, we just ignore unknown object type
                            return;

                        // distinct reasoning content from content
                        const type = GetResponseChunkFragmentType(json, 0);
                        if (type !== lastResponseChunkType) {
                            const isFirstFragmentSinceStart = (lastFragIdx === startFragIdx);
                            lastResponseChunkType = type;
                            if (currentFragment) currentFragment.elapsed = Date.now() - currentFragment.ts;
                            currentFragment = type ? {
                                id: respMsg.fragments.length + 1,
                                ts: Date.now(),
                                type: type,
                                contentType: MessageContentType.Text,
                                content: "",
                            } : null;
                            if (currentFragment) {
                                if (isFirstFragmentSinceStart) {
                                    currentFragment.first_token_latency = Date.now() - startTs;
                                }
                                respMsg.fragments.push(currentFragment);
                                ++lastFragIdx;
                            }
                        }

                        // append data
                        if (currentFragment) {
                            AppendMessageFragmentChunk(respMsg, currentFragment.id, json, false);
                            conversationStore.updateConvInStore(conv.id, conv);
                        }
                    }
                }
                catch (err) {
                    throw new Error("Error parsing streaming response", { cause: err });
                }
            },
        });

        if (options.onRequestFinish) await options.onRequestFinish(req, conv, reqMsg, respMsg, providerInfo, modelInfo);

        // update conversation status
        respMsg.status = MessageStatus.Finished;
    }
    catch (err) {
        if (options.onRequestError) {
            await options.onRequestError(req, conv, reqMsg, respMsg, providerInfo, modelInfo);
        } else {
            respMsg.status = MessageStatus.Error;
            respMsg.has_pending_fragment = false;
            respMsg.fragments.push({
                id: respMsg.fragments.length + 1,
                ts: Date.now(),
                type: MessageFragmentType.Error,
                contentType: MessageContentType.Text,
                content: TraceErrorAndGetString(err),
            });
        }
    }
    finally {
        respMsg.has_pending_fragment = false;
        if (options.onAfterRequest) await options.onAfterRequest(req, conv, reqMsg, respMsg, providerInfo, modelInfo);
        try {
            // update conversation status
            UpdateConversationInfo(conv.id);
            conversationStore.updateConvInStore(conv.id, conv);
            // remove the pending request data from store
            conversationStore.requestsInProgress.delete(conv.id);
        }
        catch (e) {
            if (!!e && e instanceof Error && (e as any).code === "ENOENT") return; // conversation has been deleted
            throw e;
        }
    }
}
