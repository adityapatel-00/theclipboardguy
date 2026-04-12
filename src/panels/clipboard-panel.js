/**
 * Clipboard history panel
 */
import { qs, el, clearChildren } from '../utils/dom.js';
import { renderClipboardItem } from '../components/clipboard-item.js';
import { showContextMenu } from '../components/context-menu.js';
import { showToast } from '../components/toast.js';
import { KeyboardNav } from '../utils/keyboard-nav.js';
import {
    getClipboardHistory,
    searchClipboardHistory,
    getClipboardItemFull,
    togglePin,
    deleteClipboardItem,
    clearUnpinnedHistory,
} from '../services/database.js';
import { pasteItem, pasteAsText } from '../services/paste.js';
import { onClipboardChange } from '../services/clipboard-monitor.js';

let panelEl = null;
let listEl = null;
let items = [];
const keyNav = new KeyboardNav();

export function initClipboardPanel() {
    panelEl = qs('#clipboard-panel');
    render();

    // Refresh when clipboard changes
    onClipboardChange(() => refresh());

    // Keyboard navigation
    keyNav.onActivate = async (index, el) => {
        const id = parseInt(el.dataset.id, 10);
        const item = await getClipboardItemFull(id);
        if (item) await pasteItem(item);
    };

    // Listen for context menu on items
    panelEl.addEventListener('contextmenu', async (e) => {
        const itemEl = e.target.closest('.clip-item');
        if (!itemEl) return;
        e.preventDefault();

        const id = parseInt(itemEl.dataset.id, 10);
        const item = await getClipboardItemFull(id);
        if (!item) return;

        showContextMenu(e.clientX, e.clientY, item, {
            onPaste: async (item) => await handlePaste(item),
            onPasteText: async (item) => await handlePasteText(item),
            onPin: async (item) => await handlePin(item),
            onDelete: async (item) => await handleDelete(item),
        });
    });
}

function render() {
    panelEl.textContent = '';

    // Header with clear button
    const header = el('div', { className: 'clip-header-actions' }, [
        el('button', {
            className: 'clear-all-btn',
            textContent: 'Clear all',
            onClick: handleClearAll,
        }),
    ]);
    panelEl.appendChild(header);

    // List container
    listEl = el('div', { className: 'clipboard-list' });
    panelEl.appendChild(listEl);
}

export async function refresh(searchQuery = '') {
    if (!listEl) return;

    if (searchQuery) {
        items = await searchClipboardHistory(searchQuery);
    } else {
        items = await getClipboardHistory();
    }

    clearChildren(listEl);

    if (items.length === 0) {
        const empty = el('div', { className: 'empty-state' }, [
            el('div', { className: 'empty-state-icon', textContent: '📋' }),
            el('div', {
                className: 'empty-state-title',
                textContent: searchQuery ? 'No results found' : 'Clipboard is empty',
            }),
            el('div', {
                className: 'empty-state-desc',
                textContent: searchQuery
                    ? 'Try a different search term'
                    : 'Copy something to get started',
            }),
        ]);
        listEl.appendChild(empty);
        keyNav.setItems([]);
        return;
    }

    // Split into pinned and recent
    const pinned = items.filter((i) => i.is_pinned);
    const recent = items.filter((i) => !i.is_pinned);

    if (pinned.length > 0) {
        listEl.appendChild(
            el('div', { className: 'section-header', textContent: 'Pinned' })
        );
        for (const item of pinned) {
            listEl.appendChild(createItemElement(item));
        }

        if (recent.length > 0) {
            const divider = el('div', { className: 'clip-divider' }, [
                el('span', { className: 'clip-divider-text', textContent: 'Recent' }),
            ]);
            listEl.appendChild(divider);
        }
    }

    for (const item of recent) {
        listEl.appendChild(createItemElement(item));
    }

    // Update keyboard nav items
    keyNav.setItems([...listEl.querySelectorAll('.clip-item')]);
}

function createItemElement(item) {
    return renderClipboardItem(item, {
        onPaste: handlePaste,
        onPasteText: handlePasteText,
        onPin: handlePin,
        onDelete: handleDelete,
    });
}

async function handlePaste(item) {
    const full = await getClipboardItemFull(item.id);
    if (full) await pasteItem(full);
}

async function handlePasteText(item) {
    const full = await getClipboardItemFull(item.id);
    if (full) await pasteAsText(full);
}

async function handlePin(item) {
    const newPinned = !item.is_pinned;
    await togglePin(item.id, newPinned);
    showToast(newPinned ? 'Pinned' : 'Unpinned');
    await refresh();
}

async function handleDelete(item) {
    await deleteClipboardItem(item.id);
    showToast('Deleted');
    await refresh();
}

async function handleClearAll() {
    await clearUnpinnedHistory();
    showToast('History cleared');
    await refresh();
}

export function handleKeyDown(e) {
    return keyNav.handleKeyDown(e);
}

export function search(query) {
    refresh(query);
}
