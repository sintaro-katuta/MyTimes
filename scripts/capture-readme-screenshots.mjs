import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outputDir = resolve(projectRoot, 'docs/images')
const baseUrl = 'http://127.0.0.1:3000'
const viteBin = resolve(projectRoot, 'node_modules/vite/bin/vite.js')

const markdown = `# 2026-06-20

## 09:30

今日の作業メモを MyTimes にまとめる。

---

## 10:15

- README 用のスクリーンショットを更新する
- 気になったことをチャット感覚で追記する

---

## 11:00

Markdown 表示に切り替えて、文章全体を見ながら整える。

---
`

const waitForServer = async (url, timeoutMs = 30_000) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Retry until Vite is ready.
    }

    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 300))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

const isServerRunning = async (url) => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

const startDevServer = async () => {
  if (await isServerRunning(baseUrl)) {
    return null
  }

  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
    cwd: projectRoot,
    stdio: 'inherit',
  })

  await waitForServer(baseUrl)
  return child
}

const installTauriMocks = async (page) => {
  await page.addInitScript((initialMarkdown) => {
    const project = {
      id: 1,
      name: 'MyTimes',
      parentId: null,
      path: '/Users/sintaro/Documents/MyTimes',
      markdownExportPath: '/Users/sintaro/Documents/MyTimes',
      iconPath: '',
    }
    const notePath = 'daily/2026-06-20.md'
    const notes = [
      { path: notePath, messageCount: 3, updatedAt: '2026-06-20T11:00:00' },
      { path: 'ideas/readme.md', messageCount: 2, updatedAt: '2026-06-19T18:00:00' },
    ]
    const settings = new Map([
      ['reopen_last_workspace', 'true'],
      ['reopen_last_note', 'true'],
      ['last_workspace_folder_id', '1'],
      ['last_workspace_note_path', notePath],
      ['custom_reaction_options', '[]'],
      ['user_name', '勝田'],
      ['user_icon_file_name', 'default-user-icon.svg'],
      ['user_icon_path', ''],
    ])
    const markdownFiles = new Map([
      [notePath, initialMarkdown],
      ['ideas/readme.md', '# README\n\n## 18:00\n\nREADME に載せる内容を整理する。\n\n---\n'],
    ])

    const parseMarkdown = (source) => {
      const messages = []
      let currentDate = null
      let currentTime = null
      let currentLines = []
      let startLine = 1
      const lines = source.split(/\r?\n/)

      const flush = (endLine) => {
        const content = currentLines.join('\n').trim()
        if (!currentTime || !content) return
        messages.push({
          date: currentDate,
          time: currentTime,
          content,
          startLine,
          endLine,
          sortOrder: messages.length,
        })
      }

      lines.forEach((line, index) => {
        const dateMatch = line.match(/^#\s+(\d{4}-\d{2}-\d{2})\s*$/)
        const timeMatch = line.match(/^##\s+(\d{2}:\d{2})\s*$/)

        if (dateMatch) {
          flush(index)
          currentDate = dateMatch[1]
          currentTime = null
          currentLines = []
          return
        }

        if (timeMatch) {
          flush(index)
          currentTime = timeMatch[1]
          currentLines = []
          startLine = index + 1
          return
        }

        if (line.trim() === '---') {
          flush(index + 1)
          currentTime = null
          currentLines = []
          return
        }

        if (currentTime) {
          currentLines.push(line)
        }
      })

      flush(lines.length)
      return { date: currentDate, messages, unparsedBlocks: [] }
    }

    const appendMessage = ({ markdown, date, time, content }) => {
      const prefix = markdown.trim()
        ? `${markdown.replace(/\s*$/, '\n\n')}${markdown.includes(`# ${date}`) ? '' : `# ${date}\n\n`}`
        : `# ${date}\n\n`

      return `${prefix}## ${time}\n\n${content.trim()}\n\n---\n`
    }

    const selectRows = ({ query, values }) => {
      if (query.includes('FROM settings')) {
        return settings.has(values[0]) ? [{ value: settings.get(values[0]) }] : []
      }

      if (query.includes('FROM folders') && query.includes("path = ''")) {
        return []
      }

      if (query.includes('FROM folders') && query.includes('path <>')) {
        return [project]
      }

      if (query.includes('FROM folders') && query.includes('WHERE path = ?')) {
        return values[0] === project.path ? [project] : []
      }

      if (query.includes('FROM messages') && query.includes('GROUP BY')) {
        return notes
      }

      if (query.includes('FROM messages')) {
        return []
      }

      if (query.includes('FROM message_reactions')) {
        return []
      }

      return []
    }

    window.__TAURI_INTERNALS__ = {
      convertFileSrc: (filePath) => filePath,
      invoke: async (cmd, args = {}) => {
        if (cmd === 'plugin:sql|load') return args.db
        if (cmd === 'plugin:sql|select') return selectRows(args)
        if (cmd === 'plugin:sql|execute') return [1, 1]
        if (cmd === 'plugin:dialog|open') {
          return args.options?.directory
            ? '/Users/sintaro/Documents/MyTimes'
            : null
        }
        if (cmd === 'resolve_user_icon_path') return '/user-icon/default-user-icon.svg'
        if (cmd === 'file_exists') return false
        if (cmd === 'list_markdown_files') return notes
        if (cmd === 'read_markdown_file') return markdownFiles.get(args.relativePath) ?? ''
        if (cmd === 'save_markdown_file') {
          markdownFiles.set(args.relativePath, args.content)
          return null
        }
        if (cmd === 'create_markdown_file') {
          markdownFiles.set(args.relativePath, args.content ?? '')
          return { path: args.relativePath }
        }
        if (cmd === 'parse_markdown_to_chat') return parseMarkdown(args.markdown)
        if (cmd === 'append_chat_message_to_markdown') return appendMessage(args.request)
        return null
      },
      transformCallback: () => Math.floor(Math.random() * 1_000_000),
      unregisterCallback: () => {},
    }
  }, markdown)
}

const capture = async () => {
  await mkdir(outputDir, { recursive: true })

  const server = await startDevServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await installTauriMocks(page)
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.getByText('今日の作業メモ').waitFor()

    await page.getByRole('button', { name: '新規プロジェクト' }).click()
    await page.getByRole('dialog').waitFor()
    await page.getByRole('button', { name: '参照' }).first().click()
    await page.getByLabel('プロジェクトフォルダー').waitFor()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: resolve(outputDir, 'usage-project.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'モーダルを閉じる' }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })

    await page.screenshot({
      path: resolve(outputDir, 'usage-chat.png'),
      fullPage: true,
    })

    await page.getByRole('tab', { name: 'Markdown' }).click()
    await page.getByLabel('Markdown本文').waitFor()
    await page.waitForTimeout(100)
    await page.screenshot({
      path: resolve(outputDir, 'usage-markdown.png'),
      fullPage: true,
    })
  } finally {
    await browser.close()
    if (server) {
      server.kill('SIGTERM')
    }
  }
}

await capture()
