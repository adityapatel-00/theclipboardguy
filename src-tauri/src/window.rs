use tauri::{AppHandle, Emitter, Manager};

pub fn toggle_popup(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show_popup(app);
        }
    }
}

pub fn show_popup(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(cursor_pos) = window.cursor_position() {
            let width = 400.0_f64;
            let height = 520.0_f64;

            let (screen_w, screen_h) = if let Ok(Some(monitor)) = window.current_monitor() {
                let size = monitor.size();
                (size.width as f64, size.height as f64)
            } else {
                // Fallback: use a safe large value so clamping still works
                (3840.0, 2160.0)
            };

            let mut x = cursor_pos.x;
            let mut y = cursor_pos.y;

            if x + width > screen_w {
                x = (x - width).max(0.0);
            }
            if y + height > screen_h {
                y = (y - height).max(0.0);
            }

            let _ = window.set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
        }

        let _ = window.show();
        let _ = app.emit("popup-shown", ());
    }
}
