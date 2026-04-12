/**
 * Global shortcut management
 */
import {
    register,
    unregister,
    isRegistered,
} from '@tauri-apps/plugin-global-shortcut';
import { togglePopup } from './window-manager.js';

let currentShortcut = null;

export async function registerShortcut(shortcutStr) {
    if (!shortcutStr) return false;

    // Unregister previous shortcut if different
    if (currentShortcut && currentShortcut !== shortcutStr) {
        try {
            await unregister(currentShortcut);
        } catch {
            // May already be unregistered
        }
    }

    try {
        const alreadyRegistered = await isRegistered(shortcutStr);
        if (!alreadyRegistered) {
            await register(shortcutStr, (event) => {
                if (event.state === 'Pressed') {
                    togglePopup();
                }
            });
        }
        currentShortcut = shortcutStr;
        return true;
    } catch (err) {
        console.error('Failed to register shortcut:', shortcutStr, err);
        return false;
    }
}

export async function unregisterCurrentShortcut() {
    if (currentShortcut) {
        try {
            await unregister(currentShortcut);
            currentShortcut = null;
        } catch {
            // Ignore
        }
    }
}

export function getCurrentShortcut() {
    return currentShortcut;
}
