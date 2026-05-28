use crate::markdown_message_escape::escape_message_content;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize)]
pub struct MarkdownMessage {
    pub id: i64,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ExportedMarkdownFile {
    pub date: String,
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct MarkdownExportResult {
    pub exported_count: usize,
    pub files: Vec<ExportedMarkdownFile>,
}

#[tauri::command]
pub fn export_messages_to_markdown(
    app: AppHandle,
    messages: Vec<MarkdownMessage>,
    export_dir: Option<String>,
) -> Result<MarkdownExportResult, String> {
    let default_entries_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("entries");
    let entries_dir = resolve_entries_dir(&default_entries_dir, export_dir);

    export_messages_to_dir(&entries_dir, &messages).map_err(|error| error.to_string())
}

fn resolve_entries_dir(default_entries_dir: &Path, export_dir: Option<String>) -> PathBuf {
    match export_dir.map(|path| path.trim().to_string()) {
        Some(path) if !path.is_empty() => {
            let requested_dir = PathBuf::from(path);

            if requested_dir.is_absolute() {
                requested_dir
            } else {
                default_entries_dir.join(requested_dir)
            }
        }
        _ => default_entries_dir.to_path_buf(),
    }
}

fn export_messages_to_dir(
    entries_dir: &Path,
    messages: &[MarkdownMessage],
) -> std::io::Result<MarkdownExportResult> {
    let mut messages_by_date = BTreeMap::<String, Vec<&MarkdownMessage>>::new();

    for message in messages {
        messages_by_date
            .entry(message_date(&message.created_at).to_string())
            .or_default()
            .push(message);
    }

    let mut files = Vec::with_capacity(messages_by_date.len());

    for (date, mut day_messages) in messages_by_date {
        day_messages.sort_by(|left, right| {
            left.created_at
                .cmp(&right.created_at)
                .then_with(|| left.id.cmp(&right.id))
        });

        let file_path = markdown_file_path(entries_dir, &date);

        if let Some(parent) = file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(&file_path, render_day_markdown(&date, &day_messages))?;

        files.push(ExportedMarkdownFile {
            date,
            path: file_path.to_string_lossy().into_owned(),
        });
    }

    Ok(MarkdownExportResult {
        exported_count: messages.len(),
        files,
    })
}

fn markdown_file_path(entries_dir: &Path, date: &str) -> PathBuf {
    let year = &date[0..4];
    let month = &date[5..7];

    entries_dir
        .join(year)
        .join(month)
        .join(format!("{date}.md"))
}

fn render_day_markdown(date: &str, messages: &[&MarkdownMessage]) -> String {
    let mut markdown = format!("# {date}\n\n");

    for message in messages {
        markdown.push_str(&format!("## {}\n\n", message_time(&message.created_at)));
        markdown.push_str(&escape_message_content(message.content.trim_end()));
        markdown.push_str("\n\n---\n\n");
    }

    markdown
}

fn message_date(created_at: &str) -> &str {
    created_at.get(0..10).unwrap_or("unknown-day")
}

fn message_time(created_at: &str) -> &str {
    created_at.get(11..16).unwrap_or("--:--")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_utf8_messages_grouped_by_day() {
        let message = MarkdownMessage {
            id: 1,
            content: "今日は Markdown エクスポートを作った。".to_string(),
            created_at: "2026-05-19T12:30:00.000Z".to_string(),
        };
        let messages = vec![&message];

        assert_eq!(
            render_day_markdown("2026-05-19", &messages),
            "# 2026-05-19\n\n## 12:30\n\n今日は Markdown エクスポートを作った。\n\n---\n\n"
        );
    }

    #[test]
    fn escapes_separator_lines_in_message_content() {
        let message = MarkdownMessage {
            id: 1,
            content: "前半\n---\n後半".to_string(),
            created_at: "2026-05-19T12:30:00.000Z".to_string(),
        };
        let messages = vec![&message];

        assert_eq!(
            render_day_markdown("2026-05-19", &messages),
            "# 2026-05-19\n\n## 12:30\n\n前半\n\\---\n後半\n\n---\n\n"
        );
    }

    #[test]
    fn escapes_chat_heading_lines_in_message_content() {
        let message = MarkdownMessage {
            id: 1,
            content: "前半\n## 10:00\n# 2026-05-26\n後半".to_string(),
            created_at: "2026-05-19T12:30:00.000Z".to_string(),
        };
        let messages = vec![&message];

        assert_eq!(
            render_day_markdown("2026-05-19", &messages),
            "# 2026-05-19\n\n## 12:30\n\n前半\n\\## 10:00\n\\# 2026-05-26\n後半\n\n---\n\n"
        );
    }

    #[test]
    fn keeps_existing_escaped_reserved_lines_in_message_content() {
        let message = MarkdownMessage {
            id: 1,
            content: "前半\n\\---\n\\## 10:00\n\\# 2026-05-26\n後半".to_string(),
            created_at: "2026-05-19T12:30:00.000Z".to_string(),
        };
        let messages = vec![&message];

        assert_eq!(
            render_day_markdown("2026-05-19", &messages),
            "# 2026-05-19\n\n## 12:30\n\n前半\n\\\\---\n\\\\## 10:00\n\\\\# 2026-05-26\n後半\n\n---\n\n"
        );
    }

    #[test]
    fn escapes_code_fence_lines_in_message_content() {
        let message = MarkdownMessage {
            id: 1,
            content: "```js\nconst value = 1;".to_string(),
            created_at: "2026-05-19T12:30:00.000Z".to_string(),
        };
        let messages = vec![&message];

        assert_eq!(
            render_day_markdown("2026-05-19", &messages),
            "# 2026-05-19\n\n## 12:30\n\n\\```js\nconst value = 1;\n\n---\n\n"
        );
    }

    #[test]
    fn builds_year_month_daily_file_path() {
        assert_eq!(
            markdown_file_path(Path::new("entries"), "2026-05-19"),
            Path::new("entries")
                .join("2026")
                .join("05")
                .join("2026-05-19.md")
        );
    }

    #[test]
    fn resolves_relative_export_dir_under_default_entries_dir() {
        assert_eq!(
            resolve_entries_dir(Path::new("entries"), Some("project".to_string())),
            Path::new("entries").join("project")
        );
    }

    #[test]
    fn keeps_absolute_export_dir() {
        let absolute_path = std::env::current_dir().unwrap().join("project");

        assert_eq!(
            resolve_entries_dir(
                Path::new("entries"),
                Some(absolute_path.to_string_lossy().into())
            ),
            absolute_path
        );
    }
}
