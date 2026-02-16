import type { Message, MessageFeatureItem, FileAttachmentInfo, MessageContent } from "./message";

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
    current_message_id: number;
    pinned: boolean;
    last_access_at: number;
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

export class MessageEditConfig {
    // thinking_enabled: boolean = false;
    features: MessageFeatureItem[] = [];
    files: FileAttachmentInfo[] = [];
}

export type ChatEditBuffer = Record<string, {
    content: MessageContent;
    config: MessageEditConfig;
}>