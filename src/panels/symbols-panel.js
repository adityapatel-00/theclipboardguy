/**
 * Symbols panel - special characters organized by category
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import { SYMBOLS_DATA, SYMBOL_CATEGORIES } from '../data/symbols-data.js';
import { copyAndPaste } from '../services/paste.js';
import { showToast } from '../components/toast.js';

let panelEl = null;
let gridEl = null;
let activeCategory = null;

export function initSymbolsPanel() {
    panelEl = qs('#symbols-panel');
    render();
}

function render() {
    panelEl.textContent = '';

    // Category tabs
    const tabs = el('div', { className: 'category-tabs' });
    for (const cat of SYMBOL_CATEGORIES) {
        const tab = el('button', {
            className: `category-tab ${!activeCategory && cat === SYMBOL_CATEGORIES[0] ? 'active' : ''}`,
            textContent: cat.icon + ' ' + cat.name,
            onClick: () => showCategory(cat.id),
        });
        tab.dataset.category = cat.id;
        tabs.appendChild(tab);
    }
    panelEl.appendChild(tabs);

    // Grid
    gridEl = el('div', { className: 'symbols-grid panel-scroll' });
    panelEl.appendChild(gridEl);

    // Show first category by default
    if (SYMBOL_CATEGORIES.length > 0) {
        showCategory(SYMBOL_CATEGORIES[0].id);
    }
}

function showCategory(categoryId) {
    activeCategory = categoryId;

    // Update tab state
    const tabs = panelEl.querySelectorAll('.category-tab');
    for (const tab of tabs) {
        tab.classList.toggle('active', tab.dataset.category === categoryId);
    }

    clearChildren(gridEl);
    const symbols = SYMBOLS_DATA[categoryId] || [];

    for (const sym of symbols) {
        const item = el('button', {
            className: 'symbol-item',
            textContent: sym.char,
            title: sym.name,
            onClick: () => handleSymbolClick(sym.char),
        });
        item.setAttribute('data-name', sym.name);
        gridEl.appendChild(item);
    }
}

async function handleSymbolClick(char) {
    await copyAndPaste(char);
    showToast(`Copied ${char}`);
}

export function search(query) {
    if (!query) {
        if (activeCategory) showCategory(activeCategory);
        return;
    }

    clearChildren(gridEl);
    const lower = query.toLowerCase();
    const matches = [];

    for (const [, symbols] of Object.entries(SYMBOLS_DATA)) {
        for (const sym of symbols) {
            if (
                sym.name.toLowerCase().includes(lower) ||
                sym.char === query
            ) {
                matches.push(sym);
            }
        }
    }

    if (matches.length === 0) {
        gridEl.appendChild(
            el('div', { className: 'empty-state' }, [
                el('div', { className: 'empty-state-icon', textContent: 'Ω' }),
                el('div', {
                    className: 'empty-state-title',
                    textContent: 'No symbols found',
                }),
            ])
        );
        return;
    }

    for (const sym of matches) {
        gridEl.appendChild(
            el('button', {
                className: 'symbol-item',
                textContent: sym.char,
                title: sym.name,
                onClick: () => handleSymbolClick(sym.char),
            })
        );
    }
}
