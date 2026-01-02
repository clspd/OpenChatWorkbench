import { useConfigStore } from "@/stores/configStore";
import { MessageEditConfig, MessageRole, MessageStatus, type Conversation, type MessageRequest } from "@/types";
import { GetProviderRequestUrl } from "@/utils/providerUrl";
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { createMessage, createMessageFragment } from "./message";
import { saveConversation } from "./conversation";

export function createRequestMessagesArray(conversation: Conversation): MessageRequest[] {
    const messages: MessageRequest[] = [];
    
    for (const msg of conversation.messages) {
        if (msg.role === MessageRole.USER || msg.role === MessageRole.ASSISTANT) {
            for (const fragment of msg.fragments) {
                if (fragment.type === "REQUEST" || fragment.type === "RESPONSE") {
                    messages.push({
                        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
                        content: fragment.content
                    });
                }
            }
        }
    }
    
    return messages;
}

export async function generateResponse(
    conversation: Conversation,
    messageId: number,
    providerId: string,
    modelId: string,
    config: MessageEditConfig,
    onChunk?: (content: string) => void,
    onComplete?: (assistantMessageId: number) => void,
    onError?: (error: Error) => void,
) {
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (!message) {
        throw new Error(`Message not found`)
    }
    if (message.role !== MessageRole.USER) {
        throw new Error(`Message role is not user`)
    }

    const provider = useConfigStore().getProviderById(providerId)
    if (!provider) {
        throw new Error(`Provider ${providerId} not found`)
    }
    const reqUrl = GetProviderRequestUrl(providerId, provider.requestPath);

    const messages = createRequestMessagesArray(conversation);

    const providerName = provider.name;

    const assistantMessage = createMessage(
        conversation,
        MessageRole.ASSISTANT,
        modelId,
        providerId,
        providerName,
        messageId,
        MessageStatus.WIP
    );

    let fullContent = '';
    let startTime = Date.now();

    await fetchEventSource(reqUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
            model: modelId,
            messages: messages,
            stream: true,
        }),
        async onopen(response) {
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
                return;
            }
            const errorText = await response.text();
            throw new Error(`Unexpected response: ${response.status} ${errorText}`);
        },
        onmessage(msg) {
            if (msg.event === 'done' || msg.data === '[DONE]') {
                return;
            }

            try {
                const data = JSON.parse(msg.data);
                const content = data.choices?.[0]?.delta?.content || '';
                
                if (content) {
                    fullContent += content;
                    onChunk?.(content);
                }
            } catch (e) {
                console.error('Failed to parse SSE message:', e);
            }
        },
        onclose() {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            
            createMessageFragment(
                assistantMessage,
                "RESPONSE",
                fullContent,
                elapsed
            );

            assistantMessage.status = MessageStatus.FINISHED;
            assistantMessage.accumulated_token_usage = fullContent.length;

            saveConversation(conversation).then(() => {
                onComplete?.(assistantMessage.id);
            });
        },
        onerror(err) {
            onError?.(err);
            throw err;
        },
    });
}
