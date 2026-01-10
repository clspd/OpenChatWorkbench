import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
    breaks: true,
    gfm: true,
});

export async function renderMarkdown(markdown: string): Promise<string> {
    if (!markdown) return '';
    
    const html = await marked.parse(markdown);
    const sanitized = DOMPurify.sanitize(html);
    
    return sanitized;
}
