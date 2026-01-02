export function safeParseJSON(str: string, defaultValue: any = {}): any {
    try {
        return JSON.parse(str)
    } catch (error) {
        return defaultValue
    }
}

import type { JSONContent } from '@tiptap/vue-3'

export function convertSimpleTiptapToMarkdown(doc: JSONContent): string {
    if (!doc || !doc.content) return ''

    const convertNode = (node: JSONContent): string => {
        switch (node.type) {
            case 'text':
                let text = node.text || ''

                if (node.marks) {
                    node.marks.forEach(mark => {
                        switch (mark.type) {
                            case 'bold':
                                text = `**${text}**`
                                break
                            case 'italic':
                                text = `*${text}*`
                                break
                            case 'code':
                                text = `\`${text}\``
                                break
                            case 'link':
                                const href = mark.attrs?.href || ''
                                text = `[${text}](${href})`
                                break
                            case 'strike':
                                text = `~~${text}~~`
                                break
                        }
                    })
                }
                return text

            case 'paragraph':
                if (node.content) {
                    const content = node.content.map(convertNode).join('')
                    return content + '\n\n'
                }
                return '\n\n'

            case 'heading':
                const level = node.attrs?.level || 1
                const hashes = '#'.repeat(level)
                if (node.content) {
                    const content = node.content.map(convertNode).join('')
                    return `${hashes} ${content.trim()}\n\n`
                }
                return ''

            case 'hardBreak':
                return '\n'

            case 'bulletList':
                if (node.content) {
                    return node.content.map(convertNode).join('') + '\n'
                }
                return ''

            case 'orderedList':
                if (node.content) {
                    return node.content.map((child, index) => {
                        const prefix = `${index + 1}. `
                        const childResult = convertNode(child)
                        return childResult.replace(/^(- |\d+\. )/, prefix)
                    }).join('') + '\n'
                }
                return ''

            case 'listItem':
                if (node.content) {
                    const content = node.content.map(convertNode).join('').trim()
                    return `- ${content}\n`
                }
                return ''

            case 'codeBlock':
                const language = node.attrs?.language || ''
                if (node.content) {
                    const content = node.content.map(convertNode).join('')
                    return `\`\`\`${language}\n${content}\`\`\`\n\n`
                }
                return ''

            case 'blockquote':
                if (node.content) {
                    const content = node.content.map(convertNode).join('')
                    return content.split('\n').map(line =>
                        line.trim() ? `> ${line}` : '>'
                    ).join('\n') + '\n\n'
                }
                return ''

            case 'horizontalRule':
                return '---\n\n'

            case 'doc':
                if (node.content) {
                    return node.content.map(convertNode).join('')
                }
                return ''

            default:
                if (node.content) {
                    return node.content.map(convertNode).join('')
                }
                return node.text || ''
        }
    }

    return doc.content
        .map(convertNode)
        .join('')
        .trim()
}

export function tiptap2markdown(json: string): string {
    const doc = safeParseJSON(json, { "type": "doc", "content": [{ "type": "paragraph", "content": [] }] })
    return convertSimpleTiptapToMarkdown(doc)
}

