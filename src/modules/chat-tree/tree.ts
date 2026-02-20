// tree.ts: convert flatten conversation data to tree structure
import type { ConversationTreeContainer, ConversationTreeNode } from "@/types/chat-tree";
import type { Conversation } from "@/types/conversation";

export function ConvertConversationToTree(conversation: Conversation): ConversationTreeContainer {
    const root: ConversationTreeContainer = {
        children: [],
    };
    const nodeMap = new Map<number, ConversationTreeNode>();
    const sortedMessages = conversation.messages.toSorted((a, b) => a.id - b.id);

    // 1st step: build a map of node id to node
    for (const msg of sortedMessages) {
        nodeMap.set(msg.id, {
            id: msg.id,
            parent_id: msg.parent_id,
            self: msg,
            children: [],
        });
    }

    // 2nd step: build the tree
    for (const msg of sortedMessages) {
        const node = nodeMap.get(msg.id)!;
        if (msg.parent_id === null) {
            root.children.push(node);
        } else {
            const parent = nodeMap.get(msg.parent_id)!;
            parent.children.push(node);
        }
    }

    return root;
}


