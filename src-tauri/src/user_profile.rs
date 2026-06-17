use std::fs;
use std::path::{Path, PathBuf};

const USER_ICON_MAX_BYTES: u64 = 200 * 1024 * 1024;
const DEFAULT_USER_ICON_FILE_NAME: &str = "default-user-icon.svg";
const USER_ICON_EXTENSIONS: [&str; 6] = ["png", "jpg", "jpeg", "webp", "svg", "ico"];

#[derive(serde::Serialize)]
pub struct SavedUserIcon {
    file_name: String,
    path: String,
}

fn public_icon_dir() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .map(|path| path.join("public").join("user-icon"))
        .ok_or_else(|| "public/user-iconフォルダーを取得できませんでした".to_string())
}

fn validate_user_icon_path(source_path: &Path) -> Result<(), String> {
    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "画像ファイルの拡張子を確認できませんでした".to_string())?;

    if !USER_ICON_EXTENSIONS.contains(&extension.as_str()) {
        return Err("PNG、JPG、JPEG、WebP、SVG、ICO の画像を選択してください".to_string());
    }

    let metadata = fs::metadata(source_path)
        .map_err(|error| format!("画像ファイルを確認できませんでした: {error}"))?;

    if !metadata.is_file() {
        return Err("画像ファイルを選択してください".to_string());
    }

    if metadata.len() > USER_ICON_MAX_BYTES {
        return Err("画像ファイルは200MB以下にしてください".to_string());
    }

    Ok(())
}

fn source_file_name(source_path: &Path) -> Result<String, String> {
    let file_name = source_path
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.to_string())
        .filter(|value| validate_user_icon_file_name(value).is_ok())
        .ok_or_else(|| "画像ファイル名を確認できませんでした".to_string())?;

    if file_name == DEFAULT_USER_ICON_FILE_NAME {
        return Err("default-user-icon.svg 以外のファイル名でアップロードしてください".to_string());
    }

    Ok(file_name)
}

fn is_same_path(left: &Path, right: &Path) -> bool {
    let Ok(left) = left.canonicalize() else {
        return false;
    };
    let Ok(right) = right.canonicalize() else {
        return false;
    };

    left == right
}

fn validate_user_icon_file_name(file_name: &str) -> Result<(), String> {
    let path = Path::new(file_name);
    let is_plain_file_name = path.file_name().and_then(|value| value.to_str()) == Some(file_name);
    let has_allowed_extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .is_some_and(|extension| USER_ICON_EXTENSIONS.contains(&extension.as_str()));

    if is_plain_file_name && has_allowed_extension {
        return Ok(());
    }

    Err("ユーザーアイコンのファイル名を確認できませんでした".to_string())
}

fn remove_uploaded_user_icons(target_dir: &Path, source_path: &Path) -> Result<(), String> {
    let entries = match fs::read_dir(target_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => {
            return Err(format!(
                "ユーザーアイコンフォルダーを確認できませんでした: {error}"
            ));
        }
    };

    for entry in entries {
        let entry =
            entry.map_err(|error| format!("ユーザーアイコンを確認できませんでした: {error}"))?;
        let path = entry.path();
        let file_name = entry.file_name();
        let file_name = file_name.to_string_lossy();

        if file_name == DEFAULT_USER_ICON_FILE_NAME || is_same_path(&path, source_path) {
            continue;
        }

        if path.is_file() {
            fs::remove_file(&path).map_err(|error| {
                format!("既存のユーザーアイコンを削除できませんでした: {error}")
            })?;
        }
    }

    Ok(())
}

fn resolve_target_path(file_name: &str) -> Result<PathBuf, String> {
    validate_user_icon_file_name(file_name)?;

    Ok(public_icon_dir()?.join(file_name))
}

fn resolved_user_icon_path(file_name: &str) -> Result<String, String> {
    let target_path = resolve_target_path(file_name)?;

    if !target_path.is_file() {
        return Err("ユーザーアイコンが見つかりませんでした".to_string());
    }

    Ok(target_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn resolve_user_icon_path(file_name: String) -> Result<String, String> {
    resolved_user_icon_path(&file_name)
}

#[tauri::command]
pub fn save_user_icon(
    source_path: String,
    current_file_name: Option<String>,
) -> Result<SavedUserIcon, String> {
    let source_path = PathBuf::from(source_path);
    validate_user_icon_path(&source_path)?;

    let file_name = source_file_name(&source_path)?;
    let target_dir = public_icon_dir()?;

    fs::create_dir_all(&target_dir)
        .map_err(|error| format!("public/user-iconフォルダーを作成できませんでした: {error}"))?;
    if let Some(current_file_name) = current_file_name
        .as_deref()
        .filter(|value| !value.is_empty())
    {
        validate_user_icon_file_name(current_file_name)?;
    }
    remove_uploaded_user_icons(&target_dir, &source_path)?;

    let target_path = target_dir.join(&file_name);
    if !is_same_path(&source_path, &target_path) {
        fs::copy(&source_path, &target_path)
            .map_err(|error| format!("ユーザーアイコンを保存できませんでした: {error}"))?;
    }

    Ok(SavedUserIcon {
        file_name,
        path: target_path.to_string_lossy().into_owned(),
    })
}
