// Markdown chat files use Markdown both as free-form user content and as
// structural storage. Lines that can be parsed as chat structure must be escaped
// before writing message content, and unescaped after parsing. The rule is
// intentionally reversible: writing adds exactly one leading backslash to a
// reserved line, and reading removes exactly one when it guards a reserved line.
pub fn escape_message_content(content: &str) -> String {
    content
        .lines()
        .map(escape_message_line)
        .collect::<Vec<_>>()
        .join("\n")
}

pub fn unescape_message_content(content: &str) -> String {
    content
        .lines()
        .map(unescape_message_line)
        .collect::<Vec<_>>()
        .join("\n")
}

fn escape_message_line(line: &str) -> String {
    let Some((prefix, suffix)) = split_at_first_content(line) else {
        return line.to_string();
    };

    if has_reserved_message_syntax(prefix, suffix) {
        format!("{prefix}\\{suffix}")
    } else {
        line.to_string()
    }
}

fn unescape_message_line(line: &str) -> String {
    let Some((prefix, suffix)) = split_at_first_content(line) else {
        return line.to_string();
    };

    if let Some(rest) = suffix.strip_prefix('\\') {
        if has_reserved_message_syntax(prefix, rest) {
            return format!("{prefix}{rest}");
        }
    }

    line.to_string()
}

fn split_at_first_content(line: &str) -> Option<(&str, &str)> {
    let first_content_index = line.find(|character: char| !character.is_whitespace())?;

    Some(line.split_at(first_content_index))
}

fn has_reserved_message_syntax(prefix: &str, suffix: &str) -> bool {
    let candidate = suffix.trim_start_matches('\\');

    is_message_separator(candidate)
        || parse_code_fence_line(candidate).is_some()
        || (prefix.is_empty()
            && (parse_date_heading(candidate).is_some() || parse_time_heading(candidate).is_some()))
}

fn is_message_separator(line: &str) -> bool {
    line.trim() == "---"
}

fn parse_code_fence_line(line: &str) -> Option<()> {
    let trimmed = line.trim_start();
    let bytes = trimmed.as_bytes();
    let marker = *bytes.first()?;

    if marker != b'`' && marker != b'~' {
        return None;
    }

    let len = bytes.iter().take_while(|byte| **byte == marker).count();

    if len >= 3 {
        Some(())
    } else {
        None
    }
}

fn parse_date_heading(line: &str) -> Option<&str> {
    let date = line.strip_prefix("# ")?;

    if is_valid_date(date) {
        Some(date)
    } else {
        None
    }
}

fn parse_time_heading(line: &str) -> Option<&str> {
    let time = line.strip_prefix("## ")?;

    if is_valid_time(time) {
        Some(time)
    } else {
        None
    }
}

fn is_valid_date(date: &str) -> bool {
    let bytes = date.as_bytes();

    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[0..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..10].iter().all(u8::is_ascii_digit)
}

fn is_valid_time(time: &str) -> bool {
    let bytes = time.as_bytes();

    if bytes.len() != 5
        || bytes[2] != b':'
        || !bytes[0..2].iter().all(u8::is_ascii_digit)
        || !bytes[3..5].iter().all(u8::is_ascii_digit)
    {
        return false;
    }

    let hour = time[0..2].parse::<u8>().unwrap_or(24);
    let minute = time[3..5].parse::<u8>().unwrap_or(60);

    hour < 24 && minute < 60
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_message_content_roundtrip_reversible() {
        let cases = [
            "通常の本文",
            "---",
            "  ---",
            "## 10:00",
            "# 2026-05-26",
            "```",
            "```js",
            "~~~",
            "\\---",
            "\\## 10:00",
            "\\# 2026-05-26",
            "\\```",
            "前半\n---\n## 10:00\n# 2026-05-26\n```js\n後半",
        ];

        for content in cases {
            let escaped = escape_message_content(content);

            assert_eq!(unescape_message_content(&escaped), content);
        }
    }

    #[test]
    fn escapes_reserved_message_lines() {
        assert_eq!(
            escape_message_content("---\n## 10:00\n# 2026-05-26\n```\n~~~md"),
            "\\---\n\\## 10:00\n\\# 2026-05-26\n\\```\n\\~~~md"
        );
    }

    #[test]
    fn keeps_escaped_reserved_message_lines_reversible() {
        let content = "\\---\n\\## 10:00\n\\# 2026-05-26\n\\```\n\\~~~md";
        let escaped = escape_message_content(content);

        assert_eq!(
            escaped,
            "\\\\---\n\\\\## 10:00\n\\\\# 2026-05-26\n\\\\```\n\\\\~~~md"
        );
        assert_eq!(unescape_message_content(&escaped), content);
    }

    #[test]
    fn escapes_indented_reserved_lines_that_the_parser_treats_as_reserved() {
        let content = "  ---\n  ```";
        let escaped = escape_message_content(content);

        assert_eq!(escaped, "  \\---\n  \\```");
        assert_eq!(unescape_message_content(&escaped), content);
    }

    #[test]
    fn leaves_indented_headings_unchanged() {
        let content = "  ## 10:00\n  # 2026-05-26";

        assert_eq!(escape_message_content(content), content);
        assert_eq!(unescape_message_content(content), content);
    }
}
