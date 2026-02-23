import type { Conversation, ConversationUserPref } from "@/types/conversation";
import type { Message } from "@/types/message";

export const dumpConversationData = (data: Conversation) => JSON.stringify(data);
export const dumpConversationPref = (data: ConversationUserPref) => JSON.stringify(data);
export const dumpMessageData = (data: Message) => JSON.stringify(data);


