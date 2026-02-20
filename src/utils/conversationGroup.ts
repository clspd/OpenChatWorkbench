import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/en'
import type { ConversationIndexItem, ConversationGroup } from '@/types/conversation'

dayjs.extend(relativeTime)

// export function groupConversationsByTime(
//     conversations: ConversationIndexItem[]
// ): ConversationGroup[] {
//     const now = dayjs()
//     const groups: ConversationGroup[] = []

//     const pinnedConversations = conversations.filter(conv => conv.pinned).sort((a, b) => b.updated_at - a.updated_at)
//     const normalConversations = conversations.filter(conv => !conv.pinned).sort((a, b) => b.updated_at - a.updated_at)

//     if (pinnedConversations.length > 0) {
//         groups.push({
//             label: 'Pinned',
//             conversations: pinnedConversations
//         })
//     }

//     const timeGroups: Map<string, {
//         conversations: ConversationIndexItem[];
//         gpOffset: number;
//     }> = new Map()

//     normalConversations.forEach(conv => {
//         const date = dayjs(conv.updated_at)
//         const diffDays = now.diff(date, 'day')

//         let groupLabel: string

//         if (diffDays <= 30) {
//             groupLabel = date.fromNow()
//         } else {
//             groupLabel = date.format('YYYY-MM')
//         }

//         if (!timeGroups.has(groupLabel)) {
//             timeGroups.set(groupLabel, {
//                 conversations: [],
//                 gpOffset: groups.length,
//             })
//         }
//         timeGroups.get(groupLabel)!.conversations.push(conv)
//     })

//     const sortedTimeGroups = Array.from(timeGroups.entries())
//         .map(([label, convs]) => ({
//             label,
//             conversations: convs.conversations.toSorted((a, b) => b.updated_at - a.updated_at),
//             // gpOffset: convs.gpOffset,
//         }))
//         // .sort((a, b) => {
//         //     return a.gpOffset - b.gpOffset
//         // })

//     groups.push(...sortedTimeGroups)

//     return groups
// }

export function groupConversationsByTime(conversations: ConversationIndexItem[]): ConversationGroup[] {
    const now = dayjs()
    const groups: ConversationGroup[] = []
    const pinned: ConversationIndexItem[] = []
    const normal: ConversationIndexItem[] = []

    for (const conv of conversations) {
        if (conv.pinned) pinned.push(conv)
        else normal.push(conv)
    }

    const sortByTime = (a: ConversationIndexItem, b: ConversationIndexItem) => b.updated_at - a.updated_at
    pinned.sort(sortByTime)
    normal.sort(sortByTime)

    if (pinned.length) {
        groups.push({ label: 'Pinned', conversations: pinned })
    }

    const timeGroups: Record<string, ConversationIndexItem[]> = {}
    for (const conv of normal) {
        const date = dayjs(conv.updated_at)
        const diffDays = now.diff(date, 'day')
        const label = diffDays <= 30 ? date.fromNow() : date.format('YYYY-MM')
        if (!timeGroups[label]) timeGroups[label] = []
        timeGroups[label].push(conv)
    }

    const groupEntries = Object.entries(timeGroups).map(([label, convs]) => ({
        label,
        conversations: convs,
        latestTime: convs[0]?.updated_at || 0
    }))
    groupEntries.sort((a, b) => b.latestTime - a.latestTime)

    groups.push(...groupEntries.map(({ label, conversations }) => ({ label, conversations })))

    return groups
}

export function formatConversationTime(
    timestamp: number
): string {
    const now = dayjs()
    const date = dayjs(timestamp)
    const diffDays = now.diff(date, 'day')

    if (diffDays === 0) {
        return date.format('HH:mm')
    } else if (diffDays < 30) {
        return date.fromNow()
    } else if (now.year() === date.year()) {
        return date.format('MM-DD')
    } else {
        return date.format('YYYY-MM-DD')
    }
}
