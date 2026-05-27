use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedMarkdownChat {
    pub date: Option<String>,
    pub messages: Vec<ParsedChatMessage>,
    pub unparsed_blocks: Vec<UnparsedMarkdownBlock>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedChatMessage {
    pub date: Option<String>,
    pub time: String,
    pub content: String,
    pub start_line: usize,
    pub end_line: usize,
    pub sort_order: usize,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UnparsedMarkdownBlock {
    pub content: String,
    pub start_line: usize,
    pub end_line: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendChatMessageRequest {
    pub markdown: String,
    pub date: String,
    pub time: String,
    pub content: String,
}

#[tauri::command]
pub fn parse_markdown_to_chat(markdown: String) -> Result<ParsedMarkdownChat, String> {
    Ok(parse_markdown_chat(&markdown))
}

#[tauri::command]
pub fn append_chat_message_to_markdown(
    request: AppendChatMessageRequest,
) -> Result<String, String> {
    append_chat_message(
        &request.markdown,
        &request.date,
        &request.time,
        &request.content,
    )
}

fn parse_markdown_chat(markdown: &str) -> ParsedMarkdownChat {
    let lines = markdown.lines().collect::<Vec<_>>();
    let mut date = None;
    let mut messages = Vec::new();
    let mut unparsed_blocks = Vec::new();
    let mut unparsed_start = None;
    let mut unparsed_lines = Vec::new();
    let mut index = 0;
    let mut in_code_fence = false;

    while index < lines.len() {
        let line = lines[index];

        if is_code_fence(line) {
            in_code_fence = !in_code_fence;
            push_unparsed_line(&mut unparsed_start, &mut unparsed_lines, index + 1, line);
            index += 1;
            continue;
        }

        if !in_code_fence {
            if let Some(found_date) = parse_date_heading(line) {
                flush_unparsed_block(
                    &mut unparsed_start,
                    &mut unparsed_lines,
                    &mut unparsed_blocks,
                    index,
                );
                date = Some(found_date.to_string());
                index += 1;
                continue;
            }

            if let Some(time) = parse_time_heading(line) {
                flush_unparsed_block(
                    &mut unparsed_start,
                    &mut unparsed_lines,
                    &mut unparsed_blocks,
                    index,
                );

                let start_line = index + 1;
                index += 1;
                let content_start_line = index + 1;
                let mut content_lines = Vec::new();
                let mut message_in_code_fence = false;
                let mut end_line = start_line;

                while index < lines.len() {
                    let current_line = lines[index];

                    if is_code_fence(current_line) {
                        message_in_code_fence = !message_in_code_fence;
                        content_lines.push(current_line.to_string());
                        end_line = index + 1;
                        index += 1;
                        continue;
                    }

                    if !message_in_code_fence && is_message_separator(current_line) {
                        end_line = index + 1;
                        index += 1;
                        break;
                    }

                    if !message_in_code_fence && parse_time_heading(current_line).is_some() {
                        end_line = index;
                        break;
                    }

                    content_lines.push(current_line.to_string());
                    end_line = index + 1;
                    index += 1;
                }

                let content = trim_markdown_body(&content_lines);
                messages.push(ParsedChatMessage {
                    date: date.clone(),
                    time: time.to_string(),
                    content,
                    start_line,
                    end_line: end_line.max(content_start_line.saturating_sub(1)),
                    sort_order: messages.len(),
                });
                continue;
            }
        }

        push_unparsed_line(&mut unparsed_start, &mut unparsed_lines, index + 1, line);
        index += 1;
    }

    flush_unparsed_block(
        &mut unparsed_start,
        &mut unparsed_lines,
        &mut unparsed_blocks,
        lines.len(),
    );

    ParsedMarkdownChat {
        date,
        messages,
        unparsed_blocks,
    }
}

fn append_chat_message(
    markdown: &str,
    date: &str,
    time: &str,
    content: &str,
) -> Result<String, String> {
    let date = validate_date(date)?;
    let time = validate_time(time)?;
    let content = content.trim_end();

    if content.trim().is_empty() {
        return Err("チャット本文が指定されていません".to_string());
    }

    let mut next_markdown = String::new();

    if markdown.trim().is_empty() {
        next_markdown.push_str(&format!("# {date}\n\n"));
    } else {
        next_markdown.push_str(markdown);
        push_append_spacing(&mut next_markdown);

        if parse_markdown_chat(markdown).date.is_none() {
            next_markdown.push_str(&format!("# {date}\n\n"));
        }
    }

    next_markdown.push_str(&format!("## {time}\n\n"));
    next_markdown.push_str(content);
    next_markdown.push_str("\n\n---\n");

    Ok(next_markdown)
}

fn push_append_spacing(markdown: &mut String) {
    if markdown.ends_with("\n\n") {
        return;
    }

    if markdown.ends_with('\n') {
        markdown.push('\n');
    } else {
        markdown.push_str("\n\n");
    }
}

fn push_unparsed_line(
    unparsed_start: &mut Option<usize>,
    unparsed_lines: &mut Vec<String>,
    line_number: usize,
    line: &str,
) {
    if unparsed_start.is_none() {
        *unparsed_start = Some(line_number);
    }

    unparsed_lines.push(line.to_string());
}

fn flush_unparsed_block(
    unparsed_start: &mut Option<usize>,
    unparsed_lines: &mut Vec<String>,
    unparsed_blocks: &mut Vec<UnparsedMarkdownBlock>,
    fallback_end_line: usize,
) {
    let Some(start_line) = unparsed_start.take() else {
        return;
    };

    let content = trim_markdown_body(unparsed_lines);

    if !content.trim().is_empty() {
        let end_line = start_line + unparsed_lines.len().saturating_sub(1);
        unparsed_blocks.push(UnparsedMarkdownBlock {
            content,
            start_line,
            end_line: end_line.max(fallback_end_line),
        });
    }

    unparsed_lines.clear();
}

fn parse_date_heading(line: &str) -> Option<&str> {
    let date = line.strip_prefix("# ")?;

    if validate_date(date).is_ok() {
        Some(date)
    } else {
        None
    }
}

fn parse_time_heading(line: &str) -> Option<&str> {
    let time = line.strip_prefix("## ")?;

    if validate_time(time).is_ok() {
        Some(time)
    } else {
        None
    }
}

fn validate_date(date: &str) -> Result<&str, String> {
    let bytes = date.as_bytes();
    let is_valid = bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit);

    if is_valid {
        Ok(date)
    } else {
        Err("日付は YYYY-MM-DD 形式で指定してください".to_string())
    }
}

fn validate_time(time: &str) -> Result<&str, String> {
    let bytes = time.as_bytes();
    let is_valid = bytes.len() == 5
        && bytes[2] == b':'
        && bytes[0..2].iter().all(u8::is_ascii_digit)
        && bytes[3..5].iter().all(u8::is_ascii_digit);

    if !is_valid {
        return Err("時刻は HH:mm 形式で指定してください".to_string());
    }

    let hour = time[0..2].parse::<u8>().unwrap_or(24);
    let minute = time[3..5].parse::<u8>().unwrap_or(60);

    if hour < 24 && minute < 60 {
        Ok(time)
    } else {
        Err("時刻は HH:mm 形式で指定してください".to_string())
    }
}

fn is_message_separator(line: &str) -> bool {
    line.trim() == "---"
}

fn is_code_fence(line: &str) -> bool {
    let trimmed = line.trim_start();

    trimmed.starts_with("```") || trimmed.starts_with("~~~")
}

fn trim_markdown_body(lines: &[String]) -> String {
    let mut start = 0;
    let mut end = lines.len();

    while start < end && lines[start].trim().is_empty() {
        start += 1;
    }

    while end > start && lines[end - 1].trim().is_empty() {
        end -= 1;
    }

    lines[start..end].join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_daily_markdown_messages() {
        let parsed = parse_markdown_chat(
            "# 2026-05-25\n\n## 09:15\n\n朝会前に整理する。\n\n---\n\n## 10:40\n\n実装方針を確認した。\n\n---\n",
        );

        assert_eq!(parsed.date.as_deref(), Some("2026-05-25"));
        assert_eq!(parsed.messages.len(), 2);
        assert_eq!(parsed.messages[0].time, "09:15");
        assert_eq!(parsed.messages[0].content, "朝会前に整理する。");
        assert_eq!(parsed.messages[1].time, "10:40");
        assert_eq!(parsed.messages[1].content, "実装方針を確認した。");
        assert!(parsed.unparsed_blocks.is_empty());
    }

    #[test]
    fn ignores_separators_and_headings_inside_code_fences() {
        let parsed = parse_markdown_chat(
            "# 2026-05-25\n\n## 09:15\n\n```md\n---\n## 10:00\n```\n\n本文。\n\n---\n",
        );

        assert_eq!(parsed.messages.len(), 1);
        assert_eq!(
            parsed.messages[0].content,
            "```md\n---\n## 10:00\n```\n\n本文。"
        );
    }

    #[test]
    fn preserves_unparsed_markdown_blocks() {
        let parsed = parse_markdown_chat(
            "# Project Note\n\n自由な本文\n\n## 09:15\n\nチャット本文\n\n---\n\n## メモ\n\n詳細\n",
        );

        assert_eq!(parsed.messages.len(), 1);
        assert_eq!(parsed.unparsed_blocks.len(), 2);
        assert_eq!(
            parsed.unparsed_blocks[0].content,
            "# Project Note\n\n自由な本文"
        );
        assert_eq!(parsed.unparsed_blocks[1].content, "## メモ\n\n詳細");
    }

    #[test]
    fn appends_chat_message_to_empty_markdown() {
        assert_eq!(
            append_chat_message("", "2026-05-25", "09:15", "朝会前に整理する。").unwrap(),
            "# 2026-05-25\n\n## 09:15\n\n朝会前に整理する。\n\n---\n"
        );
    }

    #[test]
    fn appends_chat_message_without_rewriting_existing_markdown() {
        let markdown = "# Project Note\n\n自由な本文";
        let appended = append_chat_message(markdown, "2026-05-25", "09:15", "追記する。").unwrap();

        assert_eq!(
            appended,
            "# Project Note\n\n自由な本文\n\n# 2026-05-25\n\n## 09:15\n\n追記する。\n\n---\n"
        );
    }

    #[test]
    fn appends_chat_message_without_trimming_existing_markdown() {
        let markdown = "# Project Note\n\n末尾スペースを保持する  ";
        let appended = append_chat_message(markdown, "2026-05-25", "09:15", "追記する。").unwrap();

        assert_eq!(
            appended,
            "# Project Note\n\n末尾スペースを保持する  \n\n# 2026-05-25\n\n## 09:15\n\n追記する。\n\n---\n"
        );
    }

    #[test]
    fn appends_chat_message_with_minimum_spacing() {
        let appended = append_chat_message(
            "# 2026-05-25\n\n## 08:00\n\n既存\n\n---\n",
            "2026-05-25",
            "09:15",
            "追記する。",
        )
        .unwrap();

        assert_eq!(
            appended,
            "# 2026-05-25\n\n## 08:00\n\n既存\n\n---\n\n## 09:15\n\n追記する。\n\n---\n"
        );
    }

    #[test]
    fn validates_append_inputs() {
        assert!(append_chat_message("", "2026/05/25", "09:15", "本文").is_err());
        assert!(append_chat_message("", "2026-05-25", "24:00", "本文").is_err());
        assert!(append_chat_message("", "2026-05-25", "09:15", "  ").is_err());
    }
}
