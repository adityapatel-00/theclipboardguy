/**
 * Basic HTML sanitization for previews
 * Strips scripts, event handlers, and dangerous tags/attributes
 */

const ALLOWED_TAGS = new Set([
    'p', 'br', 'b', 'i', 'u', 'em', 'strong', 'span',
    'div', 'ul', 'ol', 'li', 'a', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'blockquote', 'hr', 'sub', 'sup',
]);

export function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    cleanNode(doc, doc.body);
    return doc.body.innerHTML;
}

function cleanNode(doc, node) {
    const children = [...node.childNodes];
    for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = child.tagName.toLowerCase();
            if (!ALLOWED_TAGS.has(tag)) {
                const text = doc.createTextNode(child.textContent);
                node.replaceChild(text, child);
                continue;
            }
            // Remove dangerous attributes
            for (const attr of [...child.attributes]) {
                const name = attr.name.toLowerCase();
                if (name.startsWith('on') || name === 'style') {
                    child.removeAttribute(attr.name);
                } else if ((name === 'href' || name === 'src') && !(/^https?:\/\//i.test(attr.value))) {
                    child.removeAttribute(attr.name);
                }
            }
            cleanNode(doc, child);
        }
    }
}

export function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export function truncate(text, maxLength = 200) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
