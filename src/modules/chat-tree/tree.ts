// tree.ts: convert flatten conversation data to tree structure
import type { ConversationTreeContainer, ConversationTreeNode } from "@/types/chat-tree";
import type { Conversation } from "@/types/conversation";
import { ConvCircularReferenceError, CONVERSATION_MAX_MESSAGE_COUNT, ConvInvalidReferenceError, ConvMaxMessageCountError } from "../chat/conversation";

export function ConvertConversationToTree(conversation: Conversation): ConversationTreeContainer {
    const root: ConversationTreeContainer = {
        children: [],
    };
    const nodeMap = new Map<number, ConversationTreeNode>();
    const messages = (conversation.messages);

    if (messages.length > CONVERSATION_MAX_MESSAGE_COUNT + 1) throw new ConvMaxMessageCountError();

    // 1st step: build a map of node id to node
    for (const msg of messages) {
        nodeMap.set(msg.id, {
            id: msg.id,
            self: msg,
            parent: null,
            siblings: [],
            children: [],
        });
    }

    // 2nd step: build the tree
    for (const msg of messages) {
        const node = nodeMap.get(msg.id);
        if (!node) continue;
        if (msg.parent_id === null) {
            root.children.push(node);
        } else {
            const parent = nodeMap.get(msg.parent_id);
            if (!parent) continue;
            // check cycle
            if (msg.id === msg.parent_id) throw new ConvInvalidReferenceError();
            let current: ConversationTreeNode | null = parent;
            while (current) {
                if (current.id === msg.id) throw new ConvCircularReferenceError();
                current = current.parent;
            }
            // add data
            node.parent = parent;
            parent.children.push(node);
        }
    }

    // 3rd step: build the siblings
    for (const msg of nodeMap.values()) {
        if (msg.parent) msg.siblings = msg.parent.children;
        else msg.siblings = root.children;
    }

    return root;
}


