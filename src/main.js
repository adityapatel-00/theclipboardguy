/**
 * The Clipboard Guy - Entry Point
 * Initializes all services and the app UI
 */
import { initDatabase } from './services/database.js';
import { loadSettings, get } from './services/settings.js';
import { initWindowManager } from './services/window-manager.js';
import { initClipboardMonitor } from './services/clipboard-monitor.js';
import { registerShortcut } from './services/shortcut.js';
import { initApp } from './app.js';

async function main() {
    try {
        console.log('[TCG] Starting initialization...');

        // 1. Initialize database (runs migrations)
        console.log('[TCG] Initializing database...');
        await initDatabase();
        console.log('[TCG] Database ready');

        // 2. Load settings into memory
        console.log('[TCG] Loading settings...');
        await loadSettings();
        console.log('[TCG] Settings loaded');

        // 3. Apply saved theme
        const theme = get('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        // 4. Initialize window manager (blur-to-dismiss, toggle events)
        console.log('[TCG] Initializing window manager...');
        await initWindowManager();
        console.log('[TCG] Window manager ready');

        // 5. Re-register the saved global shortcut for this app session.
        const savedShortcut = get('shortcut');
        if (savedShortcut) {
            console.log('[TCG] Registering saved shortcut...');
            const registered = await registerShortcut(savedShortcut);
            if (!registered) {
                console.warn('[TCG] Failed to register saved shortcut:', savedShortcut);
            }
        }

        // 6. Initialize the UI
        console.log('[TCG] Initializing UI...');
        await initApp();
        console.log('[TCG] UI ready');

        // 7. Start clipboard monitoring (must be after UI so change listeners work)
        console.log('[TCG] Starting clipboard monitor...');
        await initClipboardMonitor();
        console.log('[TCG] Clipboard monitor active');

        console.log('[TCG] The Clipboard Guy initialized successfully');
    } catch (err) {
        console.error('[TCG] Failed to initialize:', err);
        // Show error on screen so it's visible even without devtools
        document.body.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding:20px;color:#ff6b6b;font-family:monospace;white-space:pre-wrap;';
        const msg = import.meta.env.DEV
            ? (err instanceof Error ? (err.message + '\n\n' + err.stack) : String(err))
            : 'Initialization failed. Please restart the application.';
        errDiv.textContent = msg;
        document.body.appendChild(errDiv);
    }
}

// Wait for DOM ready, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
