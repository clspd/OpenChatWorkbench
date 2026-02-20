// flat.ts: flatten the tree to a list of messages, with the choices specified.
import type { ConversationTreeContainer, ConversationTreeNode } from "@/types/chat-tree";
import type { Message } from "@/types/message";

// GetDefaultChoices: get the default choices for the conversation tree.
// The default choices are the choices that always go to the last child.
export function GetDefaultChoices(tree: ConversationTreeContainer): number[] {
    const choices: number[] = [];
    // function traverse({ children }: { children: ConversationTreeNode[] }) {
    //     const n = children.length - 1;
    //     if (n >= 0) {
    //         choices.push(n);
    //         traverse(children[n]!);
    //     }
    // }
    // traverse(tree);
    let currentNode: { children: ConversationTreeNode[] } = tree;
    while (currentNode.children.length > 0) {
        const lastIndex = currentNode.children.length - 1;
        choices.push(lastIndex);
        currentNode = currentNode.children[lastIndex]!;
    }
    return choices;
}

export function FlattenConversationTree(tree: ConversationTreeContainer, choices: number[]): Message[] {
    const result: Message[] = [];

    if (!tree || !Array.isArray(tree.children) || tree.children.length === 0) {
        return result;
    }

    if (!Array.isArray(choices)) {
        throw new Error("choices must be an array of numbers");
    }

    function validateIndex(idx: number | undefined | null, len: number, ctx: string): asserts idx is number {
        if (idx == null) { // allow 0, so use == null to detect undefined/null
            throw new Error(`Missing choice: ${ctx} requires an index, but choices does not provide a corresponding item.`);
        }
        if (!Number.isInteger(idx) || idx < 0 || idx >= len) {
            throw new Error(`Invalid choice: ${ctx} value ${String(idx)} is out of range (should be in 0..${len - 1}).`);
        }
    };

    validateIndex(choices[0], tree.children.length, "root.children");
    let node: ConversationTreeNode = tree.children[choices[0]]!;
    let choicePos = 1;

    while (node) {
        result.push(node.self);

        if (!node.children || node.children.length === 0) {
            break;
        }

        const nextChoice = choices[choicePos];
        validateIndex(nextChoice, node.children.length, `node(id=${node.id}).children`);
        node = node.children[nextChoice]!;
        choicePos++;
    }

    return result;
}
