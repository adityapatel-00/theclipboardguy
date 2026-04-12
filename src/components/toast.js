/**
 * Toast notification component
 */
import { qs, el } from '../utils/dom.js';

let container = null;

export function initToast() {
    container = qs('#toast-container');
}

export function showToast(message, type = 'success', duration = 2000) {
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    const toast = el('div', {
        className: `toast ${type}`,
    }, [
        el('span', { className: 'toast-icon', textContent: icons[type] || '' }),
        el('span', { textContent: message }),
    ]);

    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('fading');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }, duration);
}
