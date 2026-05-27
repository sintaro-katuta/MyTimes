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
