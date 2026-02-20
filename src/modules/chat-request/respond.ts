// chat-request/respond.ts: functions about message respond
import type { FileAttachmentInfo, MessageFeatureItem } from "@/types/message";
import { streamResponse } from "../chat-remotes/streamResponse";
import { LoadConversation } from "../chat/conversation";
import { useConfigStore } from "@/stores/configStore";
import { useAppStatePersistStore } from "@/stores/appStatePersist";

/**
 * Generate a response message for the given request message.
 * @param convId The conversation id.
 * @param reqId The request message id.
 * @param model The model name.
 * @param provider The provider name.
 * @param features The message features.
 * @param files The file attachment infos.
 * @param updateUserPreference Whether to update user preference.
 * @returns the response message id
 */
export async function GenerateResponse(
    convId: string,
    reqId: number,
    model: string,
    provider: string,
    features: MessageFeatureItem[],
    files: FileAttachmentInfo[],
    onopen?: (resp: Response) => void,
    updateUserPreference = true,
): Promise<number> {
    const conversation = await LoadConversation(convId);
    if (!conversation) throw new Error("Conversation not found");

    const providerCfg = useConfigStore().getProviderById(provider);
    if (!providerCfg) throw new Error("Provider not found");
    const modelCfg = useConfigStore().getModel(provider, model);
    if (!modelCfg) throw new Error("Model not found");

    if (updateUserPreference) {
        // save features to user preference
        const appStatePersist = useAppStatePersistStore();
        appStatePersist.userSendMsgDefaultFeatures = features;
    }

    return await streamResponse(conversation, reqId, providerCfg, modelCfg, features, files, onopen);
}

