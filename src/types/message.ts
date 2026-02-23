// Schema version
export enum SchemaVersion {
    V1 = 1
}

// Message types
export enum MessageRole {
    User = 'USER',
    Assistant = 'ASSISTANT',
    System = 'SYSTEM',
}

export enum MessageStatus {
    Finished = 'FINISHED',
    WIP = 'WIP',
    Error = 'ERROR',
}

export enum MessageFeedback {
    NotProvided = '',
    Positive = '+',
    Negative = '-',
}

export interface FileAttachmentInfo {
    id: string; // file UUID
    name: string;
    type: string;
    size: number;
    hash: string;
    referenceCount: number;
}

export interface MessageFragment {
    id: number;
    type: MessageFragmentType;
    ts: number; // timestamp in milliseconds
    elapsed?: number; // elapsed time in milliseconds
    contentType: MessageContentType;
    content: MessageContent<this['contentType']>;
}


export enum MessageFragmentType {
    Error = 'ERROR',
    Request = 'REQUEST',
    Think = 'THINK',
    Tool = 'TOOL',
    Response = 'RESPONSE',
}

export enum MessageContentType {
    Text = 'text',
}

export type MessageContent<T extends MessageContentType> =
    T extends MessageContentType.Text ? string : never;

export enum MessageFeatureType {
    Thinking = 'thinking',
    MaxTokensLimit = 'max_tokens_limit',
    BanEdit = 'ban_edit',
    BanRegenerate = 'ban_regenerate',
}

// This stores the features of the message, e.g. thinking enabled
export interface MessageFeatureItem {
    type: MessageFeatureType;
    value: MessageFeatureValue;
}

export type MessageFeatureValue = boolean | string | number;

export interface MessageUsage {
    total_tokens: number;
}

export interface Message {
    // generic fields
    id: number; // start from 1
    parent_id: number | null; // null if root message
    role: MessageRole; // who sent the message
    ts: number; // timestamp in milliseconds

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
