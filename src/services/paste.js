/**
 * Paste-back service
 * Writes content to clipboard and simulates Ctrl+V in the previously focused app
 */
import {
    writeText,
    writeImageBase64,
    writeFilesURIs,
} from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import { suppressCaptureFor } from './clipboard-monitor.js';
import { hidePopup } from './window-manager.js';
import { touchItem } from './database.js';
import * as settings from './settings.js';

// Try to import writeHtmlAndText which sets both HTML and plain text on the clipboard.
// Falls back to writeText if unavailable.
let writeHtmlAndText = null;
import('tauri-plugin-clipboard-api').then((mod) => {
    writeHtmlAndText = mod.writeHtmlAndText || null;
}).catch(() => {});

async function writeHtmlToClipboard(html, plainText) {
    if (writeHtmlAndText) {
        try {
            await writeHtmlAndText(html, plainText);
            return;
        } catch {
            // Fall through to plain text
        }
    }
    // Fallback: paste as plain text so at least something gets pasted
    await writeText(plainText || '');
}

async function hideAndPaste() {
    await hidePopup();
    await new Promise((r) => setTimeout(r, 100));
    await invoke('simulate_paste');
}

export async function pasteItem(item) {
    suppressCaptureFor(500);

    switch (item.content_type) {
        case 'text':
            await writeText(item.text_content);
            break;
        case 'html':
            await writeHtmlToClipboard(item.html_content, item.text_content);
            break;
        case 'image':
            if (item.image_data) {
                await writeImageBase64(item.image_data);
            } else if (item.image_thumb) {
                await writeImageBase64(item.image_thumb);
            }
            break;
        case 'files':
            if (item.file_paths) {
                const paths = JSON.parse(item.file_paths);
                await writeFilesURIs(paths);
            }
            break;
        case 'rtf':
            await writeText(item.text_content);
            break;
    }

    if (settings.getBool('paste_and_close')) {
        await hideAndPaste();
    }

    if (item.id) {
        await touchItem(item.id);
    }
}

export async function pasteAsText(item) {
    suppressCaptureFor(500);
    await writeText(item.text_content || '');

    if (settings.getBool('paste_and_close')) {
        await hideAndPaste();
    }

    if (item.id) {
        await touchItem(item.id);
    }
}

export async function copyAndPaste(text) {
    suppressCaptureFor(500);
    await writeText(text);
    await hideAndPaste();
}

export async function copyToClipboard(text) {
    suppressCaptureFor(500);
    await writeText(text);
}
