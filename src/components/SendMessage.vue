<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { Compartment, EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
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
} from '@lucide/vue'

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

const editorRootRef = ref(null)
const editorView = shallowRef(null)
const isSyncingEditor = ref(false)
const editableCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const message = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})
const canSend = computed(() => message.value.trim().length > 0 && !props.isSending && !props.disabled)

const focusTextarea = () => {
  nextTick(() => {
    editorView.value?.focus()
  })
}

const wrapSelectedText = ({ before, after }) => {
  const view = editorView.value

  if (!view) return

  view.dispatch(view.state.changeByRange((range) => {
    const selectedText = view.state.doc.sliceString(range.from, range.to)
    const nextText = `${before}${selectedText}${after}`
    const cursorPosition = range.from + nextText.length - after.length

    return {
      changes: { from: range.from, to: range.to, insert: nextText },
      range: EditorSelection.cursor(cursorPosition),
    }
  }))
  view.focus()
}

const insertLink = () => {
  const view = editorView.value

  if (!view) return

  view.dispatch(view.state.changeByRange((range) => {
    const selectedText = view.state.doc.sliceString(range.from, range.to)
    const nextText = `[${selectedText}]()`
    const cursorPosition = range.from + nextText.length - 1

    return {
      changes: { from: range.from, to: range.to, insert: nextText },
      range: EditorSelection.cursor(cursorPosition),
    }
  }))
  view.focus()
}

const replaceMainSelectionLines = ({ prefixFactory, stripPattern }) => {
  const view = editorView.value

  if (!view) return

  const range = view.state.selection.main
  const lineStart = view.state.doc.lineAt(range.from).from
  const lineEnd = view.state.doc.lineAt(range.to).to
  const selectedLines = view.state.doc.sliceString(lineStart, lineEnd).split('\n')
  const nextText = selectedLines
    .map((line, index) => `${prefixFactory(index)}${line.replace(stripPattern, '')}`)
    .join('\n')

  view.dispatch({
    changes: { from: lineStart, to: lineEnd, insert: nextText },
    selection: EditorSelection.range(lineStart, lineStart + nextText.length),
  })
  view.focus()
}

const prefixSelectedLines = (
  prefixFactory,
  stripPattern = /^\s*(?:[-*]|\d+[.)])\s+/,
) => {
  replaceMainSelectionLines({ prefixFactory, stripPattern })
}

const applyMarkdownTool = (action) => {
  if (props.disabled) return

  const toolActions = {
    bold: () => wrapSelectedText({ before: '**', after: '**' }),
    italic: () => wrapSelectedText({ before: '*', after: '*' }),
    strikethrough: () => wrapSelectedText({ before: '~~', after: '~~' }),
    link: insertLink,
    'ordered-list': () => prefixSelectedLines((index) => `${index + 1}. `),
    'unordered-list': () => prefixSelectedLines(() => '- '),
    quote: () => prefixSelectedLines(() => '> ', /^\s*>\s?/),
    'inline-code': () => wrapSelectedText({ before: '`', after: '`' }),
    'code-block': () => wrapSelectedText({ before: '```\n', after: '\n```' }),
  }

  toolActions[action]?.()
}

const submitMessage = () => {
  if (!canSend.value) return

  emit('submit')
}

const editorExtensions = () => [
  history(),
  markdown(),
  placeholder('独り言を呟こう'),
  EditorView.lineWrapping,
  editableCompartment.of(EditorView.editable.of(!props.disabled)),
  readOnlyCompartment.of(EditorState.readOnly.of(props.disabled)),
  keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        submitMessage()
        return true
      },
    },
    ...historyKeymap,
    ...defaultKeymap,
  ]),
  EditorView.updateListener.of((update) => {
    if (!update.docChanged || isSyncingEditor.value) return

    emit('update:modelValue', update.state.doc.toString())
  }),
]

const syncEditorValue = (value) => {
  const view = editorView.value

  if (!view || view.state.doc.toString() === value) return

  isSyncingEditor.value = true
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: value,
    },
  })
  isSyncingEditor.value = false
}

onMounted(() => {
  if (!editorRootRef.value) return

  editorView.value = new EditorView({
    parent: editorRootRef.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: editorExtensions(),
    }),
  })
})

onBeforeUnmount(() => {
  editorView.value?.destroy()
  editorView.value = null
})

watch(
  () => props.modelValue,
  (value) => {
    syncEditorValue(value)
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    const view = editorView.value

    if (!view) return

    view.dispatch({
      effects: [
        editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
        readOnlyCompartment.reconfigure(EditorState.readOnly.of(disabled)),
      ],
    })
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
        :aria-label="tool.name"
        :title="tool.name"
        :disabled="disabled"
        @click="applyMarkdownTool(tool.action)"
      >
        <component :is="tool.icon" :size="17" class="tool-icon" />
      </button>
    </div>

    <div class="message-content">
      <label class="sr-only" for="message-input">メッセージを入力</label>
      <div
        id="message-input"
        ref="editorRootRef"
        class="message-editor"
        role="textbox"
        aria-label="メッセージを入力"
        :aria-disabled="disabled"
      ></div>
      <p v-if="errorMessage" class="message-error" role="alert">{{ errorMessage }}</p>

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
}

.message-editor :deep(.cm-editor) {
  min-height: 24px;
  max-height: 240px;
  background: transparent;
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: var(--font-size);
  line-height: 1.5;
}

.message-editor :deep(.cm-editor.cm-focused) {
  outline: none;
}

.message-editor :deep(.cm-scroller) {
  max-height: 240px;
  overflow-y: auto;
  font-family: inherit;
  line-height: 1.5;
}

.message-editor :deep(.cm-content) {
  min-height: 24px;
  padding: 4px 2px 0;
  caret-color: var(--text-primary);
}

.message-editor :deep(.cm-line) {
  padding: 0;
}

.message-editor :deep(.cm-placeholder) {
  color: var(--icon-muted);
}

.message-editor :deep(.cm-activeLine) {
  background: transparent;
}

.message-editor[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.58;
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
