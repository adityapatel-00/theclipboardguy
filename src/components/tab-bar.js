/**
 * Tab bar component
 */
import { qs, el } from '../utils/dom.js';
import { hidePopup } from '../services/window-manager.js';

const TABS = [
    { id: 'clipboard', label: 'Clipboard', icon: '📋' },
    { id: 'emoji', label: 'Emoji', icon: '😊' },
    { id: 'gif', label: 'GIF', icon: '🎬' },
    { id: 'kaomoji', label: 'Kaomoji', icon: ':-)' },
    { id: 'symbols', label: 'Symbols', icon: 'Ω' },
];

let activeTab = 'clipboard';
let onTabChange = null;

export function initTabBar(callback) {
    onTabChange = callback;
    const container = qs('#tab-bar');
    render(container);
}

function render(container) {
    // Clear existing
    container.textContent = '';

    for (const tab of TABS) {
        const btn = el('button', {
            className: `tab-btn ${tab.id === activeTab ? 'active' : ''}`,
            title: tab.label,
            onClick: () => switchTab(tab.id),
        }, [
            el('span', { className: 'tab-emoji', textContent: tab.icon }),
        ]);
        btn.dataset.tab = tab.id;
        container.appendChild(btn);
    }

    // Spacer to push settings to the right
    container.appendChild(el('div', { className: 'tab-spacer' }));

    // Settings tab
    const settingsBtn = el('button', {
        className: `tab-btn ${activeTab === 'settings' ? 'active' : ''}`,
        title: 'Settings',
        onClick: () => switchTab('settings'),
    }, [
        el('span', { className: 'tab-emoji', textContent: '⚙' }),
    ]);
    settingsBtn.dataset.tab = 'settings';
    container.appendChild(settingsBtn);

    const closeBtn = el('button', {
      className: 'tab-btn close-btn',
      title: 'Close',
      onClick: hidePopup,
    }, [
        el('span', { className: 'tab-emoji', textContent: '✕' })
    ]);
  container.appendChild(closeBtn);
}

export function switchTab(tabId) {
    if (tabId === activeTab) return;
    activeTab = tabId;

    // Update button states
    const buttons = document.querySelectorAll('.tab-btn');
    for (const btn of buttons) {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    }

    // Update panel visibility
    const panels = document.querySelectorAll('.panel');
    for (const panel of panels) {
        const panelId = panel.id.replace('-panel', '');
        panel.classList.toggle('active', panelId === tabId);
    }

    if (onTabChange) onTabChange(tabId);
}

export function getActiveTab() {
    return activeTab;
}
