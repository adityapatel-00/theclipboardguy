/**
 * Clipboard monitoring service
 * Watches for clipboard changes and stores them in the database
 *
 * When copying HTML, both onTextUpdate and onHTMLUpdate fire.
 * We debounce captures so only the richest format is stored.
 */
import {
    startListening,
    onTextUpdate,
    onImageUpdate,
    onHTMLUpdate,
    onFilesUpdate,
    onRTFUpdate,
} from 'tauri-plugin-clipboard-api';
import { invoke } from '@tauri-apps/api/core';
import {
    insertClipboardItem,
    findByHash,
    touchItem,
    evictOldItems,
} from './database.js';
import * as settings from './settings.js';

let suppressCapture = false;
let suppressTimer = null;
const changeListeners = new Set();

// Pending capture — collects all formats from one clipboard change,
// then stores the richest one after a short debounce.
let pendingCapture = null;
let pendingTimer = null;
const CAPTURE_DEBOUNCE = 150; // ms to wait for all format events

export async function initClipboardMonitor() {
    await onTextUpdate(async (text) => {
        if (suppressCapture) return;
        if (!settings.getBool('monitor_text')) return;
        if (!text || text.trim().length === 0) return;

        setPending('text', { text_content: text });
    });

    await onHTMLUpdate(async (html) => {
        if (suppressCapture) return;
        if (!settings.getBool('monitor_html')) return;
        if (!html || html.trim().length === 0) return;

        const plainText = htmlToPlainText(html);

        // HTML is richer than text — overwrite pending text
        setPending('html', {
            text_content: plainText,
            html_content: html,
        });
    });

    await onImageUpdate(async (base64Image) => {
        if (suppressCapture) return;
        if (!settings.getBool('monitor_images')) return;
        if (!base64Image) return;

        const thumb = await invoke('generate_thumbnail', {
            base64Data: base64Image,
            maxWidth: 128,
        });

        // Image is highest priority — overwrite any pending text/html
        setPending('image', {
            image_data: base64Image,
            image_thumb: thumb,
        });
    });

    await onFilesUpdate(async (files) => {
        if (suppressCapture) return;
        if (!settings.getBool('monitor_files')) return;
        if (!files || files.length === 0) return;

        const fileList = JSON.stringify(files);
        setPending('files', {
            text_content: files.join('\n'),
            file_paths: fileList,
        });
    });

    await onRTFUpdate(async (rtf) => {
        if (suppressCapture) return;
        if (!settings.getBool('monitor_rtf')) return;
        if (!rtf || rtf.trim().length === 0) return;

        // Extract plain text from RTF — strip all RTF control words
        const plainText = rtfToPlainText(rtf);

        // RTF is richer than text — overwrite pending text
        setPending('rtf', {
            text_content: plainText,
            rtf_content: rtf,
        });
    });

    await startListening();
}

/**
 * Buffer a clipboard format. If multiple formats arrive within CAPTURE_DEBOUNCE ms,
 * the richest one wins (html > rtf > text).
 */
const FORMAT_PRIORITY = { text: 1, rtf: 2, html: 3, image: 4, files: 4 };

function setPending(contentType, data) {
    const priority = FORMAT_PRIORITY[contentType] || 0;
    const currentPriority = pendingCapture ? (FORMAT_PRIORITY[pendingCapture.contentType] || 0) : -1;

    // If a richer format is already pending, preserve a later plain-text payload
    // as the best text preview/source for that same clipboard change.
    if (contentType === 'text' && pendingCapture && currentPriority > priority) {
        pendingCapture = {
            ...pendingCapture,
            data: {
                ...pendingCapture.data,
                text_content: data.text_content,
            },
        };
    } else
    if (priority >= currentPriority) {
        const mergedData = {
            ...(pendingCapture?.data || {}),
            ...data,
        };

        // When text and richer formats arrive together, prefer the direct plain
        // text payload over lossy HTML/RTF-to-text extraction for previews/paste-as-text.
        if ((contentType === 'html' || contentType === 'rtf') && pendingCapture?.data?.text_content) {
            mergedData.text_content = pendingCapture.data.text_content;
        }

        pendingCapture = { contentType, data: mergedData };
    }

    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(flushPending, CAPTURE_DEBOUNCE);
}

async function flushPending() {
    if (!pendingCapture) return;
    const { contentType, data } = pendingCapture;
    pendingCapture = null;

    let hash;
    if (contentType === 'image' && data.image_data) {
        hash = await invoke('hash_image_content', { base64Data: data.image_data });
    } else if (contentType === 'files' && data.file_paths) {
        hash = await invoke('hash_content', { content: data.file_paths });
    } else {
        const hashSource = data.html_content || data.rtf_content || data.text_content || '';
        hash = await invoke('hash_content', { content: hashSource });
    }
    await storeOrTouch(contentType, hash, data);
}

async function storeOrTouch(contentType, hash, data) {
    const existing = await findByHash(hash);

    if (existing) {
        await touchItem(existing.id);
    } else {
        await insertClipboardItem({
            content_type: contentType,
            content_hash: hash,
            ...data,
        });

        const maxItems = settings.getInt('max_items') || 25;
        await evictOldItems(maxItems);
    }

    notifyChange();
}

function htmlToPlainText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Insert newlines before block-level elements so they aren't lost
    const blocks = doc.querySelectorAll('br, p, div, li, tr, h1, h2, h3, h4, h5, h6, blockquote, pre');
    for (const el of blocks) {
        el.before(doc.createTextNode('\n'));
    }
    return sanitizeExtractedPlainText(
        (doc.body.textContent || '')
    );
}

function rtfToPlainText(rtf) {
    // Decode common RTF escapes first, then strip remaining formatting controls.
    let text = rtf
        .replace(/\\\r?\n/g, '')                 // soft line wraps in RTF source
        .replace(/\\par[d]?/gi, '\n')
        .replace(/\\line\b/gi, '\n')
        .replace(/\\tab\b/gi, '\t')
        .replace(/\\emdash\b/gi, '--')
        .replace(/\\endash\b/gi, '-')
        .replace(/\\bullet\b/gi, '*')
        .replace(/\\lquote\b/gi, "'")
        .replace(/\\rquote\b/gi, "'")
        .replace(/\\ldblquote\b/gi, '"')
        .replace(/\\rdblquote\b/gi, '"')
        .replace(/\\~|\\_|\\-/g, ' ')            // non-breaking/fixed-width/optional hyphen spacing
        .replace(/\\'([0-9a-f]{2})/gi, (_, hex) => {
            const value = parseInt(hex, 16);
            return Number.isNaN(value) ? '' : String.fromCharCode(value);
        })
        .replace(/\\u(-?\d+)\??/gi, (_, codePoint) => {
            const value = Number.parseInt(codePoint, 10);
            if (Number.isNaN(value)) return '';

            // RTF Unicode escapes use signed 16-bit values.
            const normalized = value < 0 ? value + 65536 : value;
            try {
                return String.fromCodePoint(normalized);
            } catch {
                return '';
            }
        })
        .replace(/\\([{}\\])/g, '$1')            // escaped literal brace/backslash
        .replace(/\{\\fonttbl[^}]*\}/g, '')     // font table
        .replace(/\{\\colortbl[^}]*\}/g, '')     // color table
        .replace(/\{\\\*\\[^}]*\}/g, '')         // expanded color, generator, etc.
        .replace(/\{\\stylesheet[^}]*\}/g, '')   // stylesheet table
        .replace(/\{\\info[^}]*\}/g, '')         // metadata block
        .replace(/\{\\pict[\s\S]*?\}/g, '')      // embedded picture data
        .replace(/\{\\object[\s\S]*?\}/g, '')    // embedded object data
        .replace(/\\pard[^\\{}\n]*/g, '')        // paragraph formatting
        .replace(/\\pntext\b[^\\{}\n]*/gi, '')   // list marker formatting
        .replace(/\\\*/g, '')
        .replace(/\\[a-z]+\d*\s?/gi, '')         // all remaining control words
        .replace(/[{}]/g, '')                     // braces
        .replace(/\r\n|\r/g, '\n')               // normalize line endings
        .replace(/\n{3,}/g, '\n\n')              // collapse newlines
        .trim();
    return sanitizeExtractedPlainText(text || rtf); // fallback to raw if extraction fails
}

function sanitizeExtractedPlainText(text) {
    return (text || '')
        .replace(/\u0000/g, '')                  // remove embedded NUL bytes from clipboard payloads
        .replace(/\u00a0/g, ' ')                 // normalize non-breaking spaces to regular spaces 
        .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function suppressCaptureFor(ms = 300) {
    suppressCapture = true;
    clearTimeout(suppressTimer);
    suppressTimer = setTimeout(() => {
        suppressCapture = false;
    }, ms);
}

export function onClipboardChange(callback) {
    changeListeners.add(callback);
    return () => changeListeners.delete(callback);
}

function notifyChange() {
    for (const fn of changeListeners) {
        fn();
    }
}
