<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import {
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Link,
  Plus,
  SendHorizontal,
  SquareCode,
  Strikethrough,
  TextQuote,
  X,
} from '@lucide/vue'
import { markdownToHtml } from '../lib/markdown'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  isSending: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const tools = [
  { name: '太字', icon: Bold, action: 'bold' },
  { name: '斜体', icon: Italic, action: 'italic' },
  { name: '打ち消し線', icon: Strikethrough, action: 'strikethrough' },
  { name: 'リンク', icon: Link, action: 'link' },
  { name: '番号付きリスト', icon: ListOrdered, action: 'ordered-list' },
  { name: '箇条書き', icon: List, action: 'unordered-list' },
  { name: '引用', icon: TextQuote, action: 'quote' },
  { name: 'インラインコード', icon: Code, action: 'inline-code' },
  { name: 'コードブロック', icon: SquareCode, action: 'code-block' },
]

const editorRef = ref(null)
const isSyncingEditor = ref(false)
const isComposing = ref(false)
const isLinkModalOpen = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const savedSelection = ref(null)
const lastEmittedMarkdown = ref(props.modelValue)
const activeTools = ref({
  bold: false,
  italic: false,
  strikethrough: false,
})
const editingMarker = '\u200B'
const message = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})
const canSend = computed(() => message.value.trim().length > 0 && !props.isSending && !props.disabled)

const focusTextarea = () => {
  nextTick(() => {
    editorRef.value?.focus()
  })
}

const removeEditingMarkers = (value) => String(value).replaceAll(editingMarker, '')

const isEditorEmpty = () => !removeEditingMarkers(editorRef.value?.textContent ?? '').trim()

const inlineMarkdownFromNode = (node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return removeEditingMarkers(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node
  const tagName = element.tagName.toLowerCase()
  const content = Array.from(element.childNodes).map(inlineMarkdownFromNode).join('')

  if (tagName === 'br') return '\n'
  if (tagName === 'strong' || tagName === 'b') return content ? `**${content}**` : ''
  if (tagName === 'em' || tagName === 'i') return content ? `*${content}*` : ''
  if (tagName === 's' || tagName === 'strike' || tagName === 'del') return content ? `~~${content}~~` : ''
  if (tagName === 'code') return content ? `\`${content}\`` : ''
  if (tagName === 'a') return `[${content}](${element.getAttribute('href') ?? ''})`

  return content
}

const markdownFromBlock = (node, index = 0) => {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const element = node
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'li') return `${index + 1}. ${Array.from(element.childNodes).map(inlineMarkdownFromNode).join('').trim()}`
  if (tagName === 'blockquote') {
    return Array.from(element.childNodes)
      .map((child) => inlineMarkdownFromNode(child).trim())
      .filter(Boolean)
      .join('\n')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
  }
  if (tagName === 'pre') return `\`\`\`\n${removeEditingMarkers(element.textContent ?? '').replace(/\n$/, '')}\n\`\`\``
  if (tagName === 'ul') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child) => `- ${Array.from(child.childNodes).map(inlineMarkdownFromNode).join('').trim()}`)
      .join('\n')
  }
  if (tagName === 'ol') {
    return Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child, childIndex) => `${childIndex + 1}. ${Array.from(child.childNodes).map(inlineMarkdownFromNode).join('').trim()}`)
      .join('\n')
  }

  return inlineMarkdownFromNode(element).trim()
}

const editorMarkdown = () => {
  if (!editorRef.value || isEditorEmpty()) return ''

  return Array.from(editorRef.value.childNodes)
    .map(markdownFromBlock)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const syncModelValue = () => {
  if (isSyncingEditor.value) return

  const nextMarkdown = editorMarkdown()

  lastEmittedMarkdown.value = nextMarkdown
  emit('update:modelValue', nextMarkdown)
}

const isInsideIgnoredMarkdownLinkParent = (node) => {
  const parent = node.parentElement

  return Boolean(parent?.closest('a, code, pre'))
}

const setCaretAfterNode = (node) => {
  const selection = window.getSelection()
  const range = document.createRange()

  range.setStartAfter(node)
  range.setEndAfter(node)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const setCaretInsideNode = (node) => {
  const selection = window.getSelection()
  const range = document.createRange()

  range.selectNodeContents(node)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const currentEditorRange = () => {
  const selection = window.getSelection()

  if (!editorRef.value || !selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)

  if (!editorRef.value.contains(range.commonAncestorContainer)) return null

  return range
}

const closestElement = (node) => {
  if (!node) return null
  if (node.nodeType === Node.ELEMENT_NODE) return node

  return node.parentElement
}

const convertMarkdownLinksInEditor = () => {
  if (!editorRef.value) return false

  const selection = window.getSelection()
  const anchorNode = selection?.anchorNode ?? null
  const anchorOffset = selection?.anchorOffset ?? 0
  const treeWalker = document.createTreeWalker(editorRef.value, window.NodeFilter.SHOW_TEXT)
  const textNodes = []
  let currentNode = treeWalker.nextNode()

  while (currentNode) {
    textNodes.push(currentNode)
    currentNode = treeWalker.nextNode()
  }

  for (const textNode of textNodes) {
    if (isInsideIgnoredMarkdownLinkParent(textNode)) continue

    const text = textNode.textContent ?? ''
    const match = text.match(/\[([^\]\n]+)\]\(([^)\s]+)\)/)

    if (!match || match.index === undefined) continue

    const beforeText = text.slice(0, match.index)
    const afterText = text.slice(match.index + match[0].length)
    const link = document.createElement('a')
    const fragment = document.createDocumentFragment()

    link.setAttribute('href', match[2])
    link.textContent = match[1]

    if (beforeText) fragment.append(document.createTextNode(beforeText))
    fragment.append(link)
    if (afterText) fragment.append(document.createTextNode(afterText))

    const shouldMoveCaret = anchorNode === textNode && anchorOffset >= match.index + match[0].length
    textNode.parentNode?.replaceChild(fragment, textNode)

    if (shouldMoveCaret) {
      setCaretAfterNode(link)
    }

    return true
  }

  return false
}

const handleEditorInput = () => {
  if (isComposing.value) return

  while (convertMarkdownLinksInEditor()) {
    // Continue until pasted text no longer contains Markdown link syntax.
  }

  if (isEditorEmpty() && editorRef.value?.innerHTML) {
    editorRef.value.innerHTML = ''
  }

  syncModelValue()
  updateActiveTools()
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
  handleEditorInput()
}

const runCommand = (command, value = null) => {
  editorRef.value?.focus()
  document.execCommand(command, false, value)
  syncModelValue()
  updateActiveTools()
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const selectedText = () => {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) return ''

  return selection.toString()
}

const saveSelection = () => {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) return

  savedSelection.value = selection.getRangeAt(0).cloneRange()
}

const restoreSelection = () => {
  const selection = window.getSelection()

  if (!selection || !savedSelection.value) return

  selection.removeAllRanges()
  selection.addRange(savedSelection.value)
}

const openLinkModal = () => {
  if (props.disabled) return

  saveSelection()
  linkText.value = selectedText()
  linkUrl.value = ''
  isLinkModalOpen.value = true
}

const closeLinkModal = () => {
  isLinkModalOpen.value = false
  linkText.value = ''
  linkUrl.value = ''
  savedSelection.value = null
}

const applyLink = () => {
  const text = linkText.value.trim()
  const url = linkUrl.value.trim()

  if (!text || !url) return

  editorRef.value?.focus()
  restoreSelection()

  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.textContent = text

  if (range) {
    range.deleteContents()
    range.insertNode(link)
    range.setStartAfter(link)
    range.setEndAfter(link)
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    document.execCommand('insertHTML', false, `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`)
  }

  syncModelValue()
  closeLinkModal()
  updateActiveTools()
}

const insertBlockAtCursor = (block, caretTarget) => {
  editorRef.value?.focus()

  const range = currentEditorRange()

  if (!range) {
    editorRef.value?.append(block)
    setCaretInsideNode(caretTarget)
    syncModelValue()
    updateActiveTools()
    return
  }

  const fragment = range.extractContents()

  if (fragment.textContent?.trim()) {
    caretTarget.append(fragment)
  } else {
    caretTarget.append(document.createElement('br'))
  }

  range.insertNode(block)
  setCaretInsideNode(caretTarget)
  syncModelValue()
  updateActiveTools()
}

const insertInlineAtCursor = (inline, caretTarget) => {
  editorRef.value?.focus()

  const range = currentEditorRange()

  if (!range) {
    if (!caretTarget.textContent) {
      caretTarget.append(document.createTextNode(editingMarker))
    }

    editorRef.value?.append(inline)
    setCaretInsideNode(caretTarget)
    syncModelValue()
    updateActiveTools()
    return
  }

  const fragment = range.extractContents()

  if (fragment.textContent?.trim()) {
    caretTarget.append(fragment)
  } else {
    caretTarget.append(document.createTextNode(editingMarker))
  }

  range.insertNode(inline)
  setCaretInsideNode(caretTarget)
  syncModelValue()
  updateActiveTools()
}

const startList = (tagName) => {
  const list = document.createElement(tagName)
  const item = document.createElement('li')

  list.append(item)
  insertBlockAtCursor(list, item)
}

const startBlockquote = () => {
  const blockquote = document.createElement('blockquote')

  insertBlockAtCursor(blockquote, blockquote)
}

const applyInlineCode = () => {
  const code = document.createElement('code')

  insertInlineAtCursor(code, code)
}

const startCodeBlock = () => {
  const pre = document.createElement('pre')
  const code = document.createElement('code')

  pre.append(code)
  insertBlockAtCursor(pre, code)
}

const applyMarkdownTool = (action) => {
  if (props.disabled) return

  const toolActions = {
    bold: () => runCommand('bold'),
    italic: () => runCommand('italic'),
    strikethrough: () => runCommand('strikeThrough'),
    link: openLinkModal,
    'ordered-list': () => startList('ol'),
    'unordered-list': () => startList('ul'),
    quote: startBlockquote,
    'inline-code': applyInlineCode,
    'code-block': startCodeBlock,
  }

  toolActions[action]?.()
}

const updateActiveTools = () => {
  activeTools.value = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    strikethrough: document.queryCommandState('strikeThrough'),
  }
}

const removeEmptyCodeOnDelete = (event) => {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false

  const range = currentEditorRange()

  if (!range || !range.collapsed) return false

  const code = closestElement(range.startContainer)?.closest('code')

  if (!code || removeEditingMarkers(code.textContent ?? '').trim()) return false

  const removable = code.closest('pre') ?? code

  event.preventDefault()
  setCaretAfterNode(removable)
  removable.remove()
  syncModelValue()
  updateActiveTools()

  return true
}

const handleKeydown = (event) => {
  if (removeEmptyCodeOnDelete(event)) return

  if (event.key !== 'Enter') return

  if (event.metaKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    submitMessage()
  }
}

const submitMessage = () => {
  if (!canSend.value) return

  emit('submit')
}

const syncEditorValue = (value) => {
  if (!editorRef.value) return

  const currentMarkdown = editorMarkdown()

  if (currentMarkdown === value) return

  isSyncingEditor.value = true
  editorRef.value.innerHTML = value ? markdownToHtml(value) : ''
  isSyncingEditor.value = false
}

onMounted(() => {
  syncEditorValue(props.modelValue)
})

watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmittedMarkdown.value || isComposing.value) return

    syncEditorValue(value)
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    if (!editorRef.value) return

    editorRef.value.contentEditable = String(!disabled)
  },
)

watch(
  () => props.isSending,
  (isSending, wasSending) => {
    if (!isSending && wasSending) {
      focusTextarea()
    }
  },
)
</script>

<template>
  <section class="send-message" aria-label="メッセージ作成">
    <div class="message-tools" role="toolbar" aria-label="書式設定">
      <button
        v-for="tool in tools"
        :key="tool.name"
        type="button"
        class="tool-button"
        :class="{ active: activeTools[tool.action] }"
        :aria-label="tool.name"
        :title="tool.name"
        :disabled="disabled"
        @mousedown.prevent
        @click="applyMarkdownTool(tool.action)"
      >
        <component :is="tool.icon" :size="17" class="tool-icon" />
      </button>
    </div>

    <div class="message-content">
      <label class="sr-only" for="message-input">メッセージを入力</label>
      <div
        id="message-input"
        ref="editorRef"
        class="message-editor"
        role="textbox"
        :contenteditable="!disabled"
        data-placeholder="独り言を呟こう"
        aria-label="メッセージを入力"
        :aria-disabled="disabled"
        @input="handleEditorInput"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @keydown="handleKeydown"
        @keyup="updateActiveTools"
        @mouseup="updateActiveTools"
        @focus="updateActiveTools"
      ></div>
      <p v-if="errorMessage" class="message-error" role="alert">{{ errorMessage }}</p>

      <div v-if="isLinkModalOpen" class="link-dialog" role="dialog" aria-label="リンクを作成">
        <div class="link-dialog-header">
          <p class="link-dialog-title">リンク</p>
          <button type="button" class="link-dialog-close" aria-label="閉じる" @click="closeLinkModal">
            <X :size="17" aria-hidden="true" />
          </button>
        </div>
        <label class="link-field">
          <span>テキスト</span>
          <input v-model="linkText" type="text" autocomplete="off" />
        </label>
        <label class="link-field">
          <span>URL</span>
          <input v-model="linkUrl" type="url" autocomplete="off" />
        </label>
        <div class="link-dialog-actions">
          <button type="button" class="secondary-action" @click="closeLinkModal">キャンセル</button>
          <button
            type="button"
            class="primary-action"
            :disabled="!linkText.trim() || !linkUrl.trim()"
            @click="applyLink"
          >
            適用
          </button>
        </div>
      </div>

      <div class="message-actions">
        <div class="leading-actions">
          <button type="button" class="icon-button" aria-label="添付を追加">
            <Plus :size="18" class="action-icon" />
          </button>
        </div>

        <div class="trailing-actions">
          <button
            type="button"
            class="send-button"
            :disabled="!canSend"
            :aria-label="isSending ? 'メッセージを送信中' : disabled ? 'プロジェクトを選択してください' : 'メッセージを送信'"
            @click="submitMessage"
          >
            <SendHorizontal :size="18" class="action-icon" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.send-message {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: 16px;
  background: var(--surface-panel);
  box-shadow: var(--shadow-soft);
}

.message-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  background: var(--bg-message-tools);
  border-bottom: 1px solid var(--border-subtle);
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px 6px;
  background: var(--bg-send-message);
}

.tool-button,
.icon-button,
.send-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.tool-button {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  color: var(--bg-message-tools-icon);
}

.tool-button:hover,
.tool-button.active,
.icon-button:hover {
  background: var(--surface-toolbar);
  color: var(--text-primary);
}

.tool-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tool-button:disabled:hover {
  color: var(--bg-message-tools-icon);
  background: transparent;
}

.tool-button:focus-visible,
.icon-button:focus-visible,
.send-button:focus-visible {
  outline: none;
}

.tool-button:active,
.icon-button:active,
.send-button:active {
  transform: scale(0.97);
}

.message-editor {
  width: 100%;
  min-height: 24px;
  max-height: 240px;
  box-sizing: border-box;
  padding: 4px 2px 0;
  overflow-y: auto;
  color: var(--text-tertiary);
  font-size: var(--font-size);
  line-height: 1.5;
  outline: none;
  word-break: break-word;
}

.message-editor:empty::before {
  content: attr(data-placeholder);
  color: var(--icon-muted);
  pointer-events: none;
}

.message-editor:focus {
  outline: none;
}

.message-editor :deep(p),
.message-editor :deep(div),
.message-editor :deep(ul),
.message-editor :deep(ol),
.message-editor :deep(blockquote),
.message-editor :deep(pre) {
  margin: 0;
}

.message-editor :deep(ul),
.message-editor :deep(ol) {
  padding-left: 1.35em;
}

.message-editor :deep(blockquote) {
  padding-left: 10px;
  border-left: 3px solid var(--border-strong);
  color: var(--text-tertiary);
}

.message-editor :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  color: var(--text-primary);
  background: var(--surface-toolbar);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92em;
}

.message-editor :deep(pre) {
  max-width: 100%;
  padding: 10px 12px;
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-toolbar);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.message-editor :deep(a) {
  color: var(--bg-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.message-editor[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.58;
}

.link-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  background: var(--surface-panel);
  box-shadow: var(--shadow-panel);
}

.link-dialog-header,
.link-dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.link-dialog-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.link-dialog-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--icon-default);
  cursor: pointer;
}

.link-dialog-close:hover {
  color: var(--text-primary);
  background: var(--surface-toolbar);
}

.link-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
  font-size: 13px;
}

.link-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  outline: none;
  color: var(--text-primary);
  background: var(--surface-input);
}

.link-field input:focus {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.secondary-action,
.primary-action {
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 13px;
}

.secondary-action {
  color: var(--text-secondary);
  background: var(--surface-toolbar);
}

.primary-action {
  color: var(--text-inverse);
  background: var(--bg-primary);
}

.primary-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.message-actions,
.leading-actions,
.trailing-actions {
  display: flex;
  align-items: center;
}

.message-actions {
  justify-content: space-between;
}

.leading-actions,
.trailing-actions {
  gap: 6px;
}

.icon-button {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: transparent;
  color: var(--icon-default);
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-primary);
  color: var(--text-inverse);
}

.send-button:hover {
  background: var(--bg-primary-hover);
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  transform: none;
}

.message-error {
  margin: 0;
  color: var(--bg-error);
  font-size: 12px;
  line-height: 1.5;
}

.tool-icon,
.action-icon {
  display: block;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .send-message {
    border-radius: 14px;
  }

  .message-tools {
    padding: 6px;
  }

  .message-content {
    padding: 8px 8px 6px;
  }

  .message-editor {
    min-height: 24px;
  }
}
</style>
