import { invoke } from '@tauri-apps/api/core'

export const listMarkdownFiles = async (projectDir) => {
  return invoke('list_markdown_files', { projectDir })
}

export const readMarkdownFile = async ({ projectDir, relativePath }) => {
  return invoke('read_markdown_file', { projectDir, relativePath })
}

export const saveMarkdownFile = async ({ projectDir, relativePath, content }) => {
  return invoke('save_markdown_file', { projectDir, relativePath, content })
}

export const createMarkdownFile = async ({ projectDir, relativePath, content = '' }) => {
  return invoke('create_markdown_file', { projectDir, relativePath, content })
}

export const renameMarkdownFile = async ({ projectDir, currentRelativePath, nextRelativePath }) => {
  return invoke('rename_markdown_file', { projectDir, currentRelativePath, nextRelativePath })
}

export const deleteMarkdownFile = async ({ projectDir, relativePath }) => {
  return invoke('delete_markdown_file', { projectDir, relativePath })
}

export const parseMarkdownToChat = async (markdown) => {
  return invoke('parse_markdown_to_chat', { markdown })
}

export const appendChatMessageToMarkdown = async ({ markdown, date, time, content }) => {
  return invoke('append_chat_message_to_markdown', {
    request: { markdown, date, time, content },
  })
}
