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
  type: "REQUEST" | "THINK" | "RESPONSE";
  elapsed: number; // elapsed time in seconds
  content: MessageContent;
}

export type MessageContent = string;

// This stores the features of the message, e.g. thinking enabled
export interface MessageFeatureItem {
  type: string;
  // value: MessageFeature;
}

export interface Message {
  id: number; // start from 1
  parent_id: number | null; // null if root message
  accumulated_token_usage: number;
  model: string; // modelId
  provider: string; // providerId
  providerName: string;
  // thinking_enabled: boolean;
  features: MessageFeatureItem[];
  role: MessageRole;
  feedback: MessageFeedback;
  status: MessageStatus; // finished or work in progress
  files: FileAttachmentInfo[];
  fragments: MessageFragment[];
  has_pending_fragment: boolean;
}

// Conversation types
export interface Conversation {
  schemaVersion: number; // 1
  id: string; // UUID
  session: {
    created_at: number; // Timestamp
    updated_at: number;
    title: string;
    title_type: "USER" | "SYSTEM";
  }
  messages: Message[]
}

export interface ConversationUserPref {
  schemaVersion: number; // 1
  id: string; // 和Conversation的id相同
  current_message_id: number;
  pinned: boolean;
  last_access_at: number;
}

export interface ConversationIndex {
  schemaVersion: number; // 1
  conversations: ConversationIndexItem[];
  has_more: boolean;
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

export const EMPTY_MESSAGE = { "type": "doc", "content": [{ "type": "paragraph", "content": [] }] };
export const EMPTY_MESSAGE_JSON = JSON.stringify(EMPTY_MESSAGE)
