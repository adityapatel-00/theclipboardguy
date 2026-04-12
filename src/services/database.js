/**
 * SQLite database service via tauri-plugin-sql
 */
import Database from '@tauri-apps/plugin-sql';

let db = null;

export async function initDatabase() {
    db = await Database.load('sqlite:theclipboardguy.db');
    return db;
}

export function getDb() {
    if (!db) throw new Error('Database not initialized');
    return db;
}

// ── Clipboard History ──

export async function insertClipboardItem(item) {
    const result = await db.execute(
        `INSERT INTO clipboard_history
         (content_type, text_content, html_content, rtf_content, image_data, image_thumb, file_paths, source_app, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            item.content_type,
            item.text_content || null,
            item.html_content || null,
            item.rtf_content || null,
            item.image_data || null,
            item.image_thumb || null,
            item.file_paths || null,
            item.source_app || null,
            item.content_hash,
        ]
    );
    return result.lastInsertId;
}

export async function findByHash(hash) {
    const rows = await db.select(
        'SELECT id FROM clipboard_history WHERE content_hash = $1 LIMIT 1',
        [hash]
    );
    return rows.length > 0 ? rows[0] : null;
}

export async function touchItem(id) {
    await db.execute(
        "UPDATE clipboard_history SET accessed_at = datetime('now','localtime') WHERE id = $1",
        [id]
    );
}

export async function getClipboardHistory() {
    return db.select(
        `SELECT id, content_type, text_content, html_content, image_thumb, file_paths,
                source_app, is_pinned, created_at, accessed_at
         FROM clipboard_history
         ORDER BY is_pinned DESC, created_at DESC`
    );
}

export async function searchClipboardHistory(query) {
    const pattern = `%${query}%`;
    return db.select(
        `SELECT id, content_type, text_content, html_content, image_thumb, file_paths,
                source_app, is_pinned, created_at, accessed_at
         FROM clipboard_history
         WHERE text_content LIKE $1
         ORDER BY is_pinned DESC, created_at DESC`,
        [pattern]
    );
}

export async function getClipboardItemFull(id) {
    const rows = await db.select(
        'SELECT * FROM clipboard_history WHERE id = $1',
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
}

export async function togglePin(id, pinned) {
    await db.execute(
        'UPDATE clipboard_history SET is_pinned = $1 WHERE id = $2',
        [pinned ? 1 : 0, id]
    );
}

export async function deleteClipboardItem(id) {
    await db.execute('DELETE FROM clipboard_history WHERE id = $1', [id]);
}

export async function clearUnpinnedHistory() {
    await db.execute('DELETE FROM clipboard_history WHERE is_pinned = 0');
}

export async function clearAllHistory() {
    await db.execute('DELETE FROM clipboard_history');
}

export async function evictOldItems(maxItems) {
    await db.execute(
        `DELETE FROM clipboard_history
         WHERE is_pinned = 0
         AND id NOT IN (
             SELECT id FROM clipboard_history
             WHERE is_pinned = 0
             ORDER BY created_at DESC
             LIMIT $1
         )`,
        [maxItems]
    );
}

// ── Settings ──

export async function getSetting(key) {
    const rows = await db.select(
        'SELECT value FROM settings WHERE key = $1',
        [key]
    );
    return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key, value) {
    await db.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)',
        [key, String(value)]
    );
}

export async function getAllSettings() {
    const rows = await db.select('SELECT key, value FROM settings');
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}

// ── Recent Emoji ──

export async function recordEmojiUse(emoji) {
    await db.execute(
        `INSERT INTO recent_emoji (emoji, use_count, last_used)
         VALUES ($1, 1, datetime('now','localtime'))
         ON CONFLICT(emoji) DO UPDATE SET
             use_count = use_count + 1,
             last_used = datetime('now','localtime')`,
        [emoji]
    );
}

export async function getRecentEmoji(limit = 24) {
    return db.select(
        'SELECT emoji FROM recent_emoji ORDER BY last_used DESC LIMIT $1',
        [limit]
    );
}

// ── Recent Kaomoji ──

export async function recordKaomojiUse(kaomoji) {
    await db.execute(
        `INSERT INTO recent_kaomoji (kaomoji, use_count, last_used)
         VALUES ($1, 1, datetime('now','localtime'))
         ON CONFLICT(kaomoji) DO UPDATE SET
             use_count = use_count + 1,
             last_used = datetime('now','localtime')`,
        [kaomoji]
    );
}

export async function getRecentKaomoji(limit = 10) {
    return db.select(
        'SELECT kaomoji FROM recent_kaomoji ORDER BY last_used DESC LIMIT $1',
        [limit]
    );
}
