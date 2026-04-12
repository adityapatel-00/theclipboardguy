/**
 * App controller - coordinates tab switching, search routing, and global keyboard events
 */
import { initTabBar, switchTab, getActiveTab } from './components/tab-bar.js';
import {
  initSearchBar,
  updateForTab,
  clearSearch,
  focus as focusSearch,
} from './components/search-bar.js';
import {
  initClipboardPanel,
  refresh as refreshClipboard,
  search as searchClipboard,
  handleKeyDown as clipboardKeyDown,
} from './panels/clipboard-panel.js';
import { initEmojiPanel, search as searchEmoji } from './panels/emoji-panel.js';
import {
  initGifPanel,
  show as showGif,
  search as searchGif,
} from './panels/gif-panel.js';
import {
  initKaomojiPanel,
  search as searchKaomoji,
} from './panels/kaomoji-panel.js';
import {
  initSymbolsPanel,
  search as searchSymbols,
} from './panels/symbols-panel.js';
import { initSettingsPanel } from './panels/settings-panel.js';
import { initContextMenu } from './components/context-menu.js';
import { initToast } from './components/toast.js';
import { hidePopup } from './services/window-manager.js';
import { listen } from '@tauri-apps/api/event';

export async function initApp() {
  // Initialize components
  initToast();
  initContextMenu();

  // Initialize tab bar with tab-change handler
  initTabBar(handleTabChange);

  // Initialize search bar with search handler
  initSearchBar(handleSearch);

  // Initialize all panels
  initClipboardPanel();
  await initEmojiPanel();
  initGifPanel();
  await initKaomojiPanel();
  initSymbolsPanel();
  await initSettingsPanel();

  // Set initial search bar state
  updateForTab('clipboard');

  // Load initial clipboard data
  await refreshClipboard();

  // Global keyboard handlers
  document.addEventListener('keydown', handleGlobalKeyDown);

  // Listen for events from Rust
  await listen('open-settings', () => switchTab('settings'));
  await listen('clear-history', async () => {
    const { clearUnpinnedHistory } = await import('./services/database.js');
    await clearUnpinnedHistory();
    await refreshClipboard();
  });

  // Refresh clipboard when popup is shown
  document.addEventListener('popup-shown', () => {
    if (getActiveTab() === 'clipboard') {
      refreshClipboard();
      // Only focus search field for clipboard tab
      focusSearch();
    }
  });
}

function handleTabChange(tabId) {
  updateForTab(tabId);
  clearSearch();

  // Tab-specific initialization
  if (tabId === 'clipboard') {
    refreshClipboard();
  } else if (tabId === 'gif') {
    showGif();
  }
}

function handleSearch(query) {
  const tab = getActiveTab();
  switch (tab) {
    case 'clipboard':
      searchClipboard(query);
      break;
    case 'emoji':
      searchEmoji(query);
      break;
    case 'gif':
      searchGif(query);
      break;
    case 'kaomoji':
      searchKaomoji(query);
      break;
    case 'symbols':
      searchSymbols(query);
      break;
  }
}

function handleGlobalKeyDown(e) {
  // Escape closes the popup
  if (e.key === 'Escape') {
    hidePopup();
    return;
  }

  // Tab key cycles panels
  if (e.key === 'Tab' && !e.target.closest('input, select, textarea')) {
    e.preventDefault();
    const tabs = [
      'clipboard',
      'emoji',
      'gif',
      'kaomoji',
      'symbols',
      'settings',
    ];
    const current = tabs.indexOf(getActiveTab());
    const next = e.shiftKey
      ? (current - 1 + tabs.length) % tabs.length
      : (current + 1) % tabs.length;
    switchTab(tabs[next]);
    return;
  }

  // Arrow key navigation in clipboard panel
  if (getActiveTab() === 'clipboard' && !e.target.closest('input')) {
    clipboardKeyDown(e);
  }
}
