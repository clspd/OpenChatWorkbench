import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)

export interface ConversationGroup {
    label: string;
    conversations: ConversationIndexItem[];
}

export interface ConversationIndexItem {
    id: string;
    created_at: number;
    updated_at: number;
    title: string;
    pinned: boolean;
}

export function groupConversationsByTime(
    conversations: ConversationIndexItem[],
    locale: string = 'zh-cn'
): ConversationGroup[] {
    dayjs.locale(locale)
    const now = dayjs()
    const groups: Map<string, ConversationIndexItem[]> = new Map()

    conversations.forEach(conv => {
        const date = dayjs(conv.updated_at)
        const diffDays = now.diff(date, 'day')

        let groupLabel: string

        if (diffDays <= 30) {
            groupLabel = date.fromNow()
        } else {
            groupLabel = date.format('YYYY-MM')
        }

        if (!groups.has(groupLabel)) {
            groups.set(groupLabel, [])
        }
        groups.get(groupLabel)!.push(conv)
    })

    return Array.from(groups.entries())
        .map(([label, convs]) => ({
            label,
            conversations: convs.sort((a, b) => b.updated_at - a.updated_at)
        }))
        .sort((a, b) => {
            const isDateA = /^\d{4}-\d{2}$/.test(a.label)
            const isDateB = /^\d{4}-\d{2}$/.test(b.label)

            if (isDateA && !isDateB) return 1
            if (!isDateA && isDateB) return -1

            return 0
        })
}

export function formatConversationTime(
    timestamp: number,
    locale: string = 'zh-cn'
): string {
    dayjs.locale(locale)
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
