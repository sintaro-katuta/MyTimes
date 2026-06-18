use std::fs;
use std::path::PathBuf;

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    fs::metadata(PathBuf::from(path)).is_ok_and(|metadata| metadata.is_file())
}
