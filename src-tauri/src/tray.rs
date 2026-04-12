use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter,
};

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "Show Clipboard", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let clear_item = MenuItem::with_id(app, "clear", "Clear History", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&show_item, &settings_item, &clear_item, &separator, &quit_item],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("The Clipboard Guy")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                crate::window::toggle_popup(app);
            }
            "settings" => {
                let _ = app.emit("open-settings", ());
                crate::window::show_popup(app);
            }
            "clear" => {
                let _ = app.emit("clear-history", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Let positioner plugin track tray position
            tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);

            // Toggle popup on left click
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::window::toggle_popup(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
