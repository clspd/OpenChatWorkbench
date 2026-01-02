// Schema version
export enum SchemaVersion {
  V1 = 1
}

// Message types
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM'
}

export enum MessageStatus {
  FINISHED = 'FINISHED',
  WIP = 'WIP'
}

export enum MessageFeedback {
  NOT_PROVIDED = "NOT_PROVIDED",
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
}

export interface FileAttachmentInfo {
  id: string; // file UUID
  name: string;
}

export interface MessageFragment {
  id: number;
  type: "REQUEST" | "THINK" | "RESPONSE";
  elapsed: number; // 消耗的秒数
  content: MessageContent;
}

export type MessageContent = string;

export interface Message {
  id: number; // 从 1 开始
  parent_id: number | null; // null表示根消息
  accumulated_token_usage: number;
  model: string; // modelId
  provider: string; // providerId
  providerName: string;
  thinking_enabled: boolean; 
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

