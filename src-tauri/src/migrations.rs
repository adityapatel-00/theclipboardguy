use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS clipboard_history (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_type TEXT NOT NULL CHECK(content_type IN ('text','html','image','files','rtf')),
                    text_content TEXT,
                    html_content TEXT,
                    rtf_content  TEXT,
                    image_data   BLOB,
                    image_thumb  TEXT,
                    file_paths   TEXT,
                    source_app   TEXT,
                    content_hash TEXT NOT NULL,
                    is_pinned    INTEGER NOT NULL DEFAULT 0,
                    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    accessed_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                );

                CREATE INDEX IF NOT EXISTS idx_history_created ON clipboard_history(created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_history_pinned ON clipboard_history(is_pinned);
                CREATE INDEX IF NOT EXISTS idx_history_hash ON clipboard_history(content_hash);
                CREATE INDEX IF NOT EXISTS idx_history_type ON clipboard_history(content_type);

                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                INSERT OR IGNORE INTO settings (key, value) VALUES
                    ('max_items', '25'),
                    ('shortcut', ''),
                    ('theme', 'dark'),
                    ('autostart', 'false'),
                    ('monitor_text', 'true'),
                    ('monitor_images', 'true'),
                    ('monitor_html', 'true'),
                    ('monitor_files', 'true'),
                    ('monitor_rtf', 'true'),
                    ('gif_api_key', ''),
                    ('paste_and_close', 'true'),
                    ('show_timestamps', 'true'),
                    ('show_source_app', 'true');

                CREATE TABLE IF NOT EXISTS recent_emoji (
                    emoji     TEXT PRIMARY KEY,
                    use_count INTEGER NOT NULL DEFAULT 1,
                    last_used TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                );

                CREATE INDEX IF NOT EXISTS idx_emoji_recent ON recent_emoji(last_used DESC);

                CREATE TABLE IF NOT EXISTS recent_kaomoji (
                    kaomoji   TEXT PRIMARY KEY,
                    use_count INTEGER NOT NULL DEFAULT 1,
                    last_used TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                );
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "fix default shortcut and add unique hash",
            sql: r#"
                UPDATE settings SET value = '' WHERE key = 'shortcut';
                CREATE UNIQUE INDEX IF NOT EXISTS idx_history_hash_unique ON clipboard_history(content_hash);
                UPDATE settings SET key = 'gif_api_key' WHERE key = 'tenor_api_key';
                INSERT OR IGNORE INTO settings (key, value) VALUES ('gif_api_key', '');
            "#,
            kind: MigrationKind::Up,
        },
    ]
}
