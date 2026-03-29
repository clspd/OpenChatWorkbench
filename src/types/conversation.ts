import type { Message, MessageFeatureItem, FileAttachmentInfoBase, MessageContent, MessageContentType } from "./message";

// Conversation types
export type ConversationTitleType = "USER" | "SYSTEM";

export interface Conversation {
    schemaVersion: number; // 1
    id: string; // UUID
    session: {
        created_at: number; // Timestamp
        updated_at: number;
        title: string;
        title_type: ConversationTitleType;
    }
    messages: Message[]
}

export interface ConversationUserPref {
    schemaVersion: number; // 1
    id: string; // same as Conversation id
    pinned: boolean;
    choices: number[]; // stores the path to active node
}

export interface ConversationIndex {
    schemaVersion: number; // 1
    conversations: ConversationIndexItem[];
    previous: number;
}

export interface ConversationIndexItem {
    id: string;
    created_at: number; // Timestamp
    updated_at: number;
    title: string;
    pinned: boolean;
}

export interface ConversationGroup {
    label: string;
    conversations: ConversationIndexItem[];
}

export interface FlattenedConversationIndexItemTextMark {
    type: "text-mark";
    content: string;
}

export interface FlattenedConversationIndexItemConversation {
    type: "conversation";
    content: ConversationIndexItem;
}

export interface FlattenedConversationIndexItemHasMoreMark {
    type: "has-more-mark";
}

export type FlattenedConversationIndexItem =
    FlattenedConversationIndexItemConversation |
    FlattenedConversationIndexItemTextMark | 
    FlattenedConversationIndexItemHasMoreMark;

export type ChatEditBuffer = Record<string, {
    contentType: MessageContentType;
    content: MessageContent<MessageContentType>;
    features: MessageFeatureItem[];
    files: FileAttachmentInfoBase[];
    systemPrompt?: string;
    isEditing: boolean;
    editId?: number;
    parentId?: number | null;
    newChoices?: number[];
    oldEditorState?: {
        content: string;
        features: MessageFeatureItem[];
        files: FileAttachmentInfoBase[];
    };
}>

export interface PendingMessageRequest {
    convId: string;
    reqId: number;
    respId: number;
    opened: boolean;
    cancelToken?: AbortController;
}

