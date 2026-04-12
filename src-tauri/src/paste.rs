use std::thread;
use std::time::Duration;

#[tauri::command]
pub async fn simulate_paste() -> Result<(), String> {
    let handle = thread::spawn(|| -> Result<(), String> {
        thread::sleep(Duration::from_millis(80));

        // macOS: use osascript (enigo crashes on background threads)
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            let output = Command::new("osascript")
                .arg("-e")
                .arg(r#"tell application "System Events" to keystroke "v" using command down"#)
                .output()
                .map_err(|e| e.to_string())?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                let detail = if stderr.is_empty() {
                    "macOS blocked simulated paste.".to_string()
                } else {
                    format!("macOS blocked simulated paste: {stderr}")
                };
                return Err(format!(
                    "{detail} Enable Accessibility/Automation permissions for The Clipboard Guy and System Events."
                ));
            }
        }

        // Windows: use enigo (works fine)
        #[cfg(target_os = "windows")]
        {
            use enigo::{Direction, Enigo, Key, Keyboard, Settings};

            let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
            enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
            enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
            enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;
        }

        // Linux: try enigo (X11), fall back to xdotool, then ydotool (Wayland)
        #[cfg(target_os = "linux")]
        {
            use enigo::{Direction, Enigo, Key, Keyboard, Settings};
            use std::process::Command;

            let enigo_result = (|| -> Result<(), String> {
                let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
                enigo.key(Key::Control, Direction::Press).map_err(|e| e.to_string())?;
                enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| e.to_string())?;
                enigo.key(Key::Control, Direction::Release).map_err(|e| e.to_string())?;
                Ok(())
            })();

            if enigo_result.is_err() {
                // Fallback 1: xdotool (works under XWayland too)
                let xdotool = Command::new("xdotool")
                    .args(["key", "ctrl+v"])
                    .status();

                if xdotool.is_err() || !xdotool.unwrap().success() {
                    // Fallback 2: wtype (native Wayland)
                    let wtype = Command::new("wtype")
                        .args(["-M", "ctrl", "-k", "v", "-m", "ctrl"])
                        .status();

                    if wtype.is_err() || !wtype.unwrap().success() {
                        // Fallback 3: ydotool (requires ydotoold service)
                        let ydotool = Command::new("ydotool")
                            .args(["key", "29:1", "47:1", "47:0", "29:0"])
                            .status()
                            .map_err(|e| e.to_string())?;

                        if !ydotool.success() {
                            return Err(
                                "Paste simulation failed. Install xdotool, wtype, or ydotool."
                                    .to_string(),
                            );
                        }
                    }
                }
            }
        }

        Ok(())
    });

    handle.join().map_err(|_| "Paste thread panicked".to_string())?
}
