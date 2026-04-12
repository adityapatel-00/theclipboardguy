/**
 * Kaomoji panel - Japanese emoticons organized by category
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import { KAOMOJI_DATA } from '../data/kaomoji-data.js';
import { recordKaomojiUse, getRecentKaomoji } from '../services/database.js';
import { copyAndPaste } from '../services/paste.js';
import { showToast } from '../components/toast.js';

let panelEl = null;
let contentEl = null;

export async function initKaomojiPanel() {
    panelEl = qs('#kaomoji-panel');
    render();
}

function render() {
    panelEl.textContent = '';
    contentEl = el('div', { className: 'panel-scroll' });
    panelEl.appendChild(contentEl);
    showAllCategories();
}

async function showAllCategories() {
    clearChildren(contentEl);

    // Recent section
    const recent = await getRecentKaomoji(8);
    if (recent.length > 0) {
        const recentSection = createSection('Recent', recent.map((r) => r.kaomoji), false);
        contentEl.appendChild(recentSection);
    }

    // All categories
    for (const [category, kaomojis] of Object.entries(KAOMOJI_DATA)) {
        const section = createSection(category, kaomojis, true);
        contentEl.appendChild(section);
    }
}

function createSection(title, kaomojis, collapsible) {
    const section = el('div', { className: 'kaomoji-section' });

    const header = el('div', {
        className: 'kaomoji-section-header',
        onClick: () => {
            if (collapsible) section.classList.toggle('collapsed');
        },
    }, [
        el('span', { className: 'kaomoji-section-title', textContent: title }),
        collapsible
            ? el('span', { className: 'kaomoji-section-toggle', textContent: '▼' })
            : null,
    ]);
    section.appendChild(header);

    const list = el('div', { className: 'kaomoji-list' });
    for (const k of kaomojis) {
        const item = el('button', {
            className: 'kaomoji-item',
            textContent: k,
            onClick: () => handleKaomojiClick(k),
        });
        list.appendChild(item);
    }
    section.appendChild(list);

    return section;
}

async function handleKaomojiClick(kaomoji) {
    await copyAndPaste(kaomoji);
    await recordKaomojiUse(kaomoji);
    showToast('Copied');
}

export function search(query) {
    if (!query) {
        showAllCategories();
        return;
    }

    clearChildren(contentEl);
    const lower = query.toLowerCase();
    const matches = [];

    for (const [category, kaomojis] of Object.entries(KAOMOJI_DATA)) {
        if (category.toLowerCase().includes(lower)) {
            matches.push(...kaomojis);
        } else {
            for (const k of kaomojis) {
                if (k.toLowerCase().includes(lower)) {
                    matches.push(k);
                }
            }
        }
    }

    if (matches.length === 0) {
        contentEl.appendChild(
            el('div', { className: 'empty-state' }, [
                el('div', { className: 'empty-state-icon', textContent: '(·_·)' }),
                el('div', {
                    className: 'empty-state-title',
                    textContent: 'No kaomoji found',
                }),
            ])
        );
        return;
    }

    const list = el('div', { className: 'kaomoji-list' });
    for (const k of matches) {
        list.appendChild(
            el('button', {
                className: 'kaomoji-item',
                textContent: k,
                onClick: () => handleKaomojiClick(k),
            })
        );
    }
    contentEl.appendChild(list);
}
