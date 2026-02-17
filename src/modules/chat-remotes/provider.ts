import type { ProviderConfig } from "@/types/config";
import { MessageFragmentType } from "@/types/message";
import type { ChatCompletionChunk } from "openai/resources";

export function GetProviderUrl(data: ProviderConfig) {
    const base = data.baseURL, path = data.requestPath;
    if (base.endsWith('/') && path.startsWith('/'))
        return base + path.substring(1);
    else if (!base.endsWith('/') && !path.startsWith('/'))
        return base + '/' + path;
    else
        return base + path;
}


export function GetResponseChunkFragmentType(chunk: ChatCompletionChunk, choiceId: number) {
    const choice = chunk.choices[choiceId];
    if (!choice) return null;
    if ((choice.delta as any).reasoning_content !== undefined) //  reasoning_content is not a standard property
        return MessageFragmentType.Think;
    else if (choice.delta.content !== undefined)
        return MessageFragmentType.Response;
    else
        return null;
}

