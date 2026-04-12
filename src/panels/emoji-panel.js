/**
 * Emoji panel - categorized emoji picker with search and recents
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import { EMOJI_DATA, EMOJI_CATEGORIES } from '../data/emoji-data.js';
import { recordEmojiUse, getRecentEmoji } from '../services/database.js';
import { copyAndPaste } from '../services/paste.js';
import { showToast } from '../components/toast.js';

let panelEl = null;
let gridEl = null;
let activeCategory = 'recent';

export async function initEmojiPanel() {
    panelEl = qs('#emoji-panel');
    render();
    await showCategory('recent');
}

function render() {
    panelEl.textContent = '';

    // Category tabs
    const tabs = el('div', { className: 'category-tabs' });

    const recentTab = el('button', {
        className: 'category-tab active',
        textContent: '\u{1F550}',
        title: 'Recent',
        onClick: () => showCategory('recent'),
    });
    recentTab.dataset.category = 'recent';
    tabs.appendChild(recentTab);

    for (const cat of EMOJI_CATEGORIES) {
        const tab = el('button', {
            className: 'category-tab',
            textContent: cat.icon,
            title: cat.name,
            onClick: () => showCategory(cat.id),
        });
        tab.dataset.category = cat.id;
        tabs.appendChild(tab);
    }

    panelEl.appendChild(tabs);

    gridEl = el('div', { className: 'emoji-grid panel-scroll' });
    panelEl.appendChild(gridEl);
}

async function showCategory(categoryId) {
    activeCategory = categoryId;

    const tabs = panelEl.querySelectorAll('.category-tab');
    for (const tab of tabs) {
        tab.classList.toggle('active', tab.dataset.category === categoryId);
    }

    clearChildren(gridEl);

    if (categoryId === 'recent') {
        const recent = await getRecentEmoji(40);
        const emojis = recent.map((r) => r.emoji);
        if (emojis.length === 0) {
            gridEl.style.display = 'flex';
            gridEl.appendChild(
                el('div', { className: 'empty-state' }, [
                    el('div', { className: 'empty-state-icon', textContent: '\u{1F550}' }),
                    el('div', { className: 'empty-state-title', textContent: 'No recent emoji' }),
                    el('div', { className: 'empty-state-desc', textContent: 'Emoji you use will appear here' }),
                ])
            );
            return;
        }
        gridEl.style.display = '';
        for (const emoji of emojis) {
            gridEl.appendChild(createEmojiButton(emoji, emoji));
        }
    } else {
        gridEl.style.display = '';
        const items = EMOJI_DATA[categoryId] || [];
        for (const item of items) {
            gridEl.appendChild(createEmojiButton(item.e, item.n || item.e));
        }
    }
}

function createEmojiButton(emoji, title) {
    return el('button', {
        className: 'emoji-item',
        textContent: emoji,
        title: title,
        onClick: () => handleEmojiClick(emoji),
    });
}

async function handleEmojiClick(emoji) {
    await recordEmojiUse(emoji);
    await copyAndPaste(emoji);
}

export function search(query) {
    if (!query) {
        showCategory(activeCategory);
        return;
    }

    clearChildren(gridEl);
    const lower = query.toLowerCase();
    const matches = [];
    const seen = new Set();

    for (const [, items] of Object.entries(EMOJI_DATA)) {
        for (const item of items) {
            if (seen.has(item.e)) continue;
            const nameMatch = item.n && item.n.toLowerCase().includes(lower);
            const kwMatch = item.k && item.k.some((kw) => kw.toLowerCase().includes(lower));
            if (nameMatch || kwMatch) {
                seen.add(item.e);
                matches.push(item);
            }
        }
    }

    if (matches.length === 0) {
        gridEl.style.display = 'flex';
        gridEl.appendChild(
            el('div', { className: 'empty-state' }, [
                el('div', { className: 'empty-state-icon', textContent: '\u{1F50D}' }),
                el('div', { className: 'empty-state-title', textContent: 'No emoji found' }),
            ])
        );
        return;
    }

    gridEl.style.display = '';
    for (const item of matches) {
        gridEl.appendChild(createEmojiButton(item.e, item.n || item.e));
    }
}
