mod markdown_chat;
mod markdown_export;
mod markdown_files;
mod markdown_message_escape;
mod user_profile;

use markdown_chat::{append_chat_message_to_markdown, parse_markdown_to_chat};
use markdown_export::export_messages_to_markdown;
use markdown_files::{
    create_markdown_file, delete_markdown_file, list_markdown_files, read_markdown_file,
    rename_markdown_file, save_markdown_file,
};
use tauri_plugin_sql::{Migration, MigrationKind};
use user_profile::{resolve_user_icon_path, save_user_icon};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/1_create_initial_tables.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_folders",
            sql: include_str!("../migrations/2_add_folders.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_folder_icon_path",
            sql: include_str!("../migrations/3_add_folder_icon_path.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_root_folder",
            sql: include_str!("../migrations/4_add_root_folder.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_message_reactions",
            sql: include_str!("../migrations/5_add_message_reactions.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            export_messages_to_markdown,
            parse_markdown_to_chat,
            append_chat_message_to_markdown,
            list_markdown_files,
            read_markdown_file,
            save_markdown_file,
            create_markdown_file,
            rename_markdown_file,
            delete_markdown_file,
            resolve_user_icon_path,
            save_user_icon
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:mytimes.db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
