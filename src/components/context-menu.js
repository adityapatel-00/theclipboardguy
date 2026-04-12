/**
 * Right-click context menu
 */
import { qs, el, hide, show } from '../utils/dom.js';

let menuEl = null;
let currentItem = null;

export function initContextMenu() {
    menuEl = qs('#context-menu');

    // Close on any click outside
    document.addEventListener('click', () => hideContextMenu());
    document.addEventListener('contextmenu', (e) => {
        // Only prevent default on our clip items
        if (!e.target.closest('.clip-item')) {
            hideContextMenu();
        }
    });
}

export function showContextMenu(x, y, item, actions) {
    currentItem = item;
    menuEl.textContent = '';

    const menuItems = [
        { label: 'Paste', icon: '📋', action: () => actions.onPaste(item) },
        { label: 'Paste as text', icon: 'T', action: () => actions.onPasteText(item) },
        { type: 'separator' },
        {
            label: item.is_pinned ? 'Unpin' : 'Pin',
            icon: item.is_pinned ? '📌' : '📍',
            action: () => actions.onPin(item),
        },
        { type: 'separator' },
        {
            label: 'Delete',
            icon: '🗑',
            className: 'danger',
            action: () => actions.onDelete(item),
        },
    ];

    for (const mi of menuItems) {
        if (mi.type === 'separator') {
            menuEl.appendChild(el('div', { className: 'ctx-separator' }));
            continue;
        }

        const row = el('div', {
            className: `ctx-item ${mi.className || ''}`,
            onClick: () => {
                mi.action();
                hideContextMenu();
            },
        }, [
            el('span', { className: 'ctx-item-icon', textContent: mi.icon }),
            el('span', { textContent: mi.label }),
        ]);
        menuEl.appendChild(row);
    }

    // Position menu, ensuring it stays within bounds
    const rect = document.body.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = menuEl.offsetHeight || 180;

    let posX = x;
    let posY = y;

    if (x + menuWidth > rect.width) posX = rect.width - menuWidth - 8;
    if (y + menuHeight > rect.height) posY = rect.height - menuHeight - 8;

    menuEl.style.left = `${posX}px`;
    menuEl.style.top = `${posY}px`;
    show(menuEl);
}

export function hideContextMenu() {
    if (menuEl) hide(menuEl);
    currentItem = null;
}
