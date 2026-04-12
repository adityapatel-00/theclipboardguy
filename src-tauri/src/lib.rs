mod commands;
mod migrations;
mod paste;
mod tray;
mod window;

use tauri_plugin_global_shortcut::ShortcutState;

pub fn run() {
    let db_migrations = migrations::get_migrations();

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:theclipboardguy.db", db_migrations)
                .build(),
        )
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        window::toggle_popup(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            tray::create_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            paste::simulate_paste,
            commands::hash_content,
            commands::hash_image_content,
            commands::generate_thumbnail,
            commands::is_wayland,
        ])
        .run(tauri::generate_context!())
        .expect("error while running The Clipboard Guy");
}
