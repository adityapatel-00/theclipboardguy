/**
 * Search bar component
 */
import { qs, el } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';

let searchInput = null;
let clearBtn = null;
let onSearchCallback = null;

// Tabs that have search functionality
const SEARCHABLE_TABS = new Set(['clipboard', 'emoji', 'gif', 'kaomoji', 'symbols']);

export function initSearchBar(callback) {
    onSearchCallback = callback;
    const container = qs('#search-bar-container');

    const wrapper = el('div', { className: 'search-input-wrapper' }, [
        el('span', { className: 'search-icon', textContent: '🔍' }),
    ]);

    searchInput = el('input', {
        className: 'search-input',
        type: 'text',
        placeholder: 'Search...',
    });

    clearBtn = el('button', {
        className: 'search-clear',
        textContent: '✕',
        onClick: clearSearch,
    });

    wrapper.appendChild(searchInput);
    wrapper.appendChild(clearBtn);
    container.appendChild(wrapper);

    // Debounced search
    const debouncedSearch = debounce((query) => {
        if (onSearchCallback) onSearchCallback(query);
    }, 200);

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearBtn.classList.toggle('visible', query.length > 0);
        debouncedSearch(query);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (searchInput.value) {
                clearSearch();
            }
        }
    });
}

export function setPlaceholder(text) {
    if (searchInput) searchInput.placeholder = text;
}

export function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        clearBtn.classList.remove('visible');
        if (onSearchCallback) onSearchCallback('');
    }
}

export function focus() {
    if (searchInput) searchInput.focus();
}

export function updateForTab(tabId) {
    const container = qs('#search-bar-container');
    if (!SEARCHABLE_TABS.has(tabId)) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    clearSearch();

    const placeholders = {
        clipboard: 'Search clipboard history...',
        emoji: 'Search emoji...',
        gif: 'Search GIFs...',
        kaomoji: 'Search kaomoji...',
        symbols: 'Search symbols...',
    };

    setPlaceholder(placeholders[tabId] || 'Search...');
}

export function getValue() {
    return searchInput ? searchInput.value.trim() : '';
}
