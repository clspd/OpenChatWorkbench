import { MessageRole } from "@/types/message";

export const msgRoleIdentifyMap = {
    [MessageRole.System]: 'system',
    [MessageRole.User]: 'user',
    [MessageRole.Assistant]: 'assistant',
};
export const prettyMsgRole = {
    [MessageRole.System]: 'System',
    [MessageRole.User]: 'User',
    [MessageRole.Assistant]: 'Assistant',
};