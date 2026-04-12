use base64::{engine::general_purpose::STANDARD, Engine};
use image::GenericImageView;
use sha2::{Digest, Sha256};
use std::io::Cursor;
use std::env;

#[tauri::command]
pub fn hash_content(content: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[tauri::command]
pub fn hash_image_content(base64_data: String) -> Result<String, String> {
    // Hash first 64KB of image data for performance
    let bytes = STANDARD.decode(&base64_data).map_err(|e| e.to_string())?;
    let chunk = if bytes.len() > 65536 { &bytes[..65536] } else { &bytes };
    let mut hasher = Sha256::new();
    hasher.update(chunk);
    Ok(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
pub fn generate_thumbnail(base64_data: String, max_width: u32) -> Result<String, String> {
    let bytes = STANDARD.decode(&base64_data).map_err(|e| e.to_string())?;
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;

    let (w, h) = img.dimensions();
    if w <= max_width {
        // Already small enough, return as-is
        return Ok(base64_data);
    }

    let ratio = max_width as f64 / w as f64;
    let new_h = (h as f64 * ratio) as u32;
    let thumb = img.thumbnail(max_width, new_h);

    let mut buf = Cursor::new(Vec::new());
    thumb
        .write_to(&mut buf, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(STANDARD.encode(buf.into_inner()))
}

#[tauri::command]
pub fn is_wayland() -> bool {
    env::var("WAYLAND_DISPLAY").is_ok()
}
