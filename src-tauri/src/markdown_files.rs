use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownFileEntry {
    pub path: String,
    pub size: u64,
    pub modified_at_ms: Option<u64>,
}

#[tauri::command]
pub fn list_markdown_files(project_dir: String) -> Result<Vec<MarkdownFileEntry>, String> {
    let project_dir = canonical_project_dir(&project_dir)?;
    let mut files = Vec::new();

    collect_markdown_files(&project_dir, &project_dir, &mut files)?;
    files.sort_by(|left, right| left.path.cmp(&right.path));

    Ok(files)
}

#[tauri::command]
pub fn read_markdown_file(project_dir: String, relative_path: String) -> Result<String, String> {
    let project_dir = canonical_project_dir(&project_dir)?;
    let file_path = resolve_existing_markdown_file(&project_dir, &relative_path)?;

    fs::read_to_string(&file_path)
        .map_err(|error| format!("Markdownファイルの読み込みに失敗しました: {error}"))
}

#[tauri::command]
pub fn save_markdown_file(
    project_dir: String,
    relative_path: String,
    content: String,
) -> Result<MarkdownFileEntry, String> {
    let project_dir = canonical_project_dir(&project_dir)?;
    let file_path = resolve_writable_markdown_file(&project_dir, &relative_path)?;

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("保存先フォルダーの作成に失敗しました: {error}"))?;
    }

    fs::write(&file_path, content)
        .map_err(|error| format!("Markdownファイルの保存に失敗しました: {error}"))?;

    markdown_file_entry(&project_dir, &file_path)
}

fn canonical_project_dir(project_dir: &str) -> Result<PathBuf, String> {
    let trimmed = project_dir.trim();

    if trimmed.is_empty() {
        return Err("プロジェクトディレクトリが指定されていません".to_string());
    }

    let path = PathBuf::from(trimmed);
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("プロジェクトディレクトリを解決できません: {error}"))?;

    if !canonical.is_dir() {
        return Err("プロジェクトディレクトリがフォルダーではありません".to_string());
    }

    Ok(canonical)
}

fn collect_markdown_files(
    project_dir: &Path,
    current_dir: &Path,
    files: &mut Vec<MarkdownFileEntry>,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|error| format!("Markdownファイル一覧の取得に失敗しました: {error}"))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("ファイル情報の取得に失敗しました: {error}"))?;
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|error| format!("ファイル種別の取得に失敗しました: {error}"))?;

        if file_type.is_dir() {
            collect_markdown_files(project_dir, &path, files)?;
            continue;
        }

        if file_type.is_file() && is_markdown_path(&path) {
            files.push(markdown_file_entry(project_dir, &path)?);
        }
    }

    Ok(())
}

fn resolve_existing_markdown_file(
    project_dir: &Path,
    relative_path: &str,
) -> Result<PathBuf, String> {
    let file_path = project_dir.join(safe_relative_markdown_path(relative_path)?);
    let canonical = file_path
        .canonicalize()
        .map_err(|error| format!("Markdownファイルを解決できません: {error}"))?;

    if !canonical.starts_with(project_dir) {
        return Err("プロジェクト外のMarkdownファイルにはアクセスできません".to_string());
    }

    if !canonical.is_file() {
        return Err("指定されたMarkdownファイルが存在しません".to_string());
    }

    Ok(canonical)
}

fn resolve_writable_markdown_file(
    project_dir: &Path,
    relative_path: &str,
) -> Result<PathBuf, String> {
    let relative_path = safe_relative_markdown_path(relative_path)?;
    let file_path = project_dir.join(relative_path);
    let parent = file_path
        .parent()
        .ok_or_else(|| "保存先フォルダーを解決できません".to_string())?;

    let canonical_parent = if parent.exists() {
        parent
            .canonicalize()
            .map_err(|error| format!("保存先フォルダーを解決できません: {error}"))?
    } else {
        let existing_parent = nearest_existing_parent(parent, project_dir)?;
        existing_parent
            .canonicalize()
            .map_err(|error| format!("保存先フォルダーを解決できません: {error}"))?
    };

    if !canonical_parent.starts_with(project_dir) {
        return Err("プロジェクト外にMarkdownファイルを保存できません".to_string());
    }

    Ok(file_path)
}

fn nearest_existing_parent<'a>(path: &'a Path, project_dir: &'a Path) -> Result<&'a Path, String> {
    let mut current = path;

    loop {
        if current.exists() {
            return Ok(current);
        }

        current = current
            .parent()
            .ok_or_else(|| "保存先フォルダーを解決できません".to_string())?;

        if !current.starts_with(project_dir) {
            return Err("プロジェクト外にMarkdownファイルを保存できません".to_string());
        }
    }
}

fn safe_relative_markdown_path(relative_path: &str) -> Result<PathBuf, String> {
    let trimmed = relative_path.trim();

    if trimmed.is_empty() {
        return Err("Markdownファイルの相対パスが指定されていません".to_string());
    }

    let path = Path::new(trimmed);

    if path.is_absolute() {
        return Err("Markdownファイルの相対パスには絶対パスを指定できません".to_string());
    }

    let mut safe_path = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Normal(part) => safe_path.push(part),
            Component::CurDir => {}
            _ => {
                return Err(
                    "Markdownファイルの相対パスにプロジェクト外への参照は指定できません"
                        .to_string(),
                )
            }
        }
    }

    if safe_path.as_os_str().is_empty() {
        return Err("Markdownファイルの相対パスが指定されていません".to_string());
    }

    if !is_markdown_path(&safe_path) {
        return Err("Markdownファイルの拡張子は .md である必要があります".to_string());
    }

    Ok(safe_path)
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
}

fn markdown_file_entry(project_dir: &Path, file_path: &Path) -> Result<MarkdownFileEntry, String> {
    let metadata = fs::metadata(file_path)
        .map_err(|error| format!("Markdownファイル情報の取得に失敗しました: {error}"))?;
    let relative_path = file_path
        .strip_prefix(project_dir)
        .map_err(|_| "プロジェクト外のMarkdownファイルは扱えません".to_string())?;

    Ok(MarkdownFileEntry {
        path: relative_path.to_string_lossy().replace('\\', "/"),
        size: metadata.len(),
        modified_at_ms: metadata
            .modified()
            .ok()
            .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
            .and_then(|duration| u64::try_from(duration.as_millis()).ok()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TestProject {
        path: PathBuf,
    }

    impl TestProject {
        fn new() -> Self {
            let unique_name = format!(
                "mytimes-markdown-files-{}",
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            );
            let path = std::env::temp_dir().join(unique_name);
            fs::create_dir_all(&path).unwrap();

            Self { path }
        }

        fn path_string(&self) -> String {
            self.path.to_string_lossy().into_owned()
        }
    }

    impl Drop for TestProject {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn lists_markdown_files_recursively() {
        let project = TestProject::new();
        fs::write(project.path.join("readme.md"), "# Readme").unwrap();
        fs::create_dir_all(project.path.join("frontend")).unwrap();
        fs::write(project.path.join("frontend").join("button.md"), "# Button").unwrap();
        fs::write(project.path.join("frontend").join("button.txt"), "ignored").unwrap();

        let files = list_markdown_files(project.path_string()).unwrap();
        let paths = files.into_iter().map(|file| file.path).collect::<Vec<_>>();

        assert_eq!(paths, vec!["frontend/button.md", "readme.md"]);
    }

    #[test]
    fn reads_markdown_file_by_relative_path() {
        let project = TestProject::new();
        fs::create_dir_all(project.path.join("frontend")).unwrap();
        fs::write(project.path.join("frontend").join("button.md"), "# Button").unwrap();

        assert_eq!(
            read_markdown_file(project.path_string(), "frontend/button.md".to_string()).unwrap(),
            "# Button"
        );
    }

    #[test]
    fn saves_markdown_file_by_relative_path() {
        let project = TestProject::new();

        let file = save_markdown_file(
            project.path_string(),
            "frontend/button.md".to_string(),
            "# Button".to_string(),
        )
        .unwrap();

        assert_eq!(file.path, "frontend/button.md");
        assert_eq!(
            fs::read_to_string(project.path.join("frontend").join("button.md")).unwrap(),
            "# Button"
        );
    }

    #[test]
    fn rejects_path_traversal() {
        let project = TestProject::new();

        assert!(read_markdown_file(project.path_string(), "../secret.md".to_string()).is_err());
        assert!(save_markdown_file(
            project.path_string(),
            "../secret.md".to_string(),
            "secret".to_string()
        )
        .is_err());
    }

    #[test]
    fn rejects_non_markdown_files() {
        let project = TestProject::new();

        assert!(save_markdown_file(
            project.path_string(),
            "frontend/button.txt".to_string(),
            "text".to_string()
        )
        .is_err());
    }
}
