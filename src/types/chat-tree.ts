// These data are memory only and wouldn't be saved to disk
// therefore they are not versioned
import type { Message } from "./message";

// the root node
export interface ConversationTreeContainer {
    children: ConversationTreeNode[];
}

// the tree node
export interface ConversationTreeNode {
    id: number;
    parent_id: number | null;
    self: Message;
    children: ConversationTreeNode[];
}

