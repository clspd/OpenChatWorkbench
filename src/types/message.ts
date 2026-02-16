// Schema version
export enum SchemaVersion {
    V1 = 1
}

// Message types
export enum MessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
}

export enum MessageStatus {
    FINISHED = 'finished',
    WIP = 'wip'
}

export enum MessageFeedback {
    NOT_PROVIDED = '',
    POSITIVE = '+',
    NEGATIVE = '-',
}

export interface FileAttachmentInfo {
    id: string; // file UUID
    name: string;
}

export interface MessageFragment {
    id: number;
    type: MessageFragmentType;
    elapsed?: number; // elapsed time in seconds
    content: MessageContent;
}

export type MessageFragmentType = "REQUEST" | "THINK" | "RESPONSE";

export type MessageContent = string;

export enum MessageFeatureType {
    THINKING = 'thinking',
}

// This stores the features of the message, e.g. thinking enabled
export interface MessageFeatureItem {
    type: MessageFeatureType;
    value: MessageFeature;
}

export type MessageFeature = boolean | string | number;

export interface MessageUsage {
    total_tokens: number;
}

export interface Message {
    // generic fields
    id: number; // start from 1
    parent_id: number | null; // null if root message
    role: MessageRole; // who sent the message

    // model fields (might be empty if not sent by a model)
    model?: string; // modelId
    provider?: string; // providerId
    providerName?: string; // user-friendly provider name

    // extra information fields (might be empty if not provided)
    features?: MessageFeatureItem[]; // message features (e.g. thinking enabled)
    feedback?: MessageFeedback; // message feedback (positive/negative)
    usage?: MessageUsage; // message usage (token count)

    // content fields
    status: MessageStatus; // finished or work in progress
    files: FileAttachmentInfo[]; // attached files
    fragments: MessageFragment[]; // message fragments (core content)
    has_pending_fragment: boolean; // whether there is a pending fragment (work in progress)
}

// ----------

export const EMPTY_MESSAGE = { "type": "doc", "content": [{ "type": "paragraph", "content": [] }] };
export const EMPTY_MESSAGE_JSON = JSON.stringify(EMPTY_MESSAGE)
