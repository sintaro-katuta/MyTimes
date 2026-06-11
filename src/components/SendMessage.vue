<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Bold, Italic, Strikethrough, List, ListOrdered, Link, SquareCode, Plus, SendHorizontal } from '@lucide/vue'

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
  { name: 'コードブロック', icon: SquareCode, action: 'code-block' },
]

const textareaRef = ref(null)
const isComposing = ref(false)
const message = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
  },
})
const canSend = computed(() => message.value.trim().length > 0 && !props.isSending && !props.disabled)

const resizeTextarea = () => {
  if (!textareaRef.value) return

  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
}

const focusTextarea = () => {
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

const updateMessageSelection = ({ value, selectionStart, selectionEnd }) => {
  message.value = value

  nextTick(() => {
    if (!textareaRef.value) return

    textareaRef.value.focus()
    textareaRef.value.setSelectionRange(selectionStart, selectionEnd)
    resizeTextarea()
  })
}

const selectedTextareaRange = () => {
  const textarea = textareaRef.value

  return {
    start: textarea?.selectionStart ?? message.value.length,
    end: textarea?.selectionEnd ?? message.value.length,
  }
}

const replaceSelectedText = ({ nextText, selectionStart, selectionEnd }) => {
  const { start, end } = selectedTextareaRange()
  const value = message.value

  updateMessageSelection({
    value: `${value.slice(0, start)}${nextText}${value.slice(end)}`,
    selectionStart: start + selectionStart,
    selectionEnd: start + selectionEnd,
  })
}

const wrapSelectedText = ({ before, after, placeholder }) => {
  const { start, end } = selectedTextareaRange()
  const selectedText = message.value.slice(start, end) || placeholder
  const nextText = `${before}${selectedText}${after}`

  replaceSelectedText({
    nextText,
    selectionStart: before.length,
    selectionEnd: before.length + selectedText.length,
  })
}

const prefixSelectedLines = (prefixFactory) => {
  const { start, end } = selectedTextareaRange()
  const value = message.value
  const lineStart = value.lastIndexOf('\n', Math.max(start - 1, 0)) + 1
  const lineEndIndex = value.indexOf('\n', end)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  const selectedLines = value.slice(lineStart, lineEnd).split('\n')
  const nextText = selectedLines
    .map((line, index) => `${prefixFactory(index)}${line.replace(/^\s*(?:[-*]|\d+[.)])\s+/, '')}`)
    .join('\n')

  updateMessageSelection({
    value: `${value.slice(0, lineStart)}${nextText}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + nextText.length,
  })
}

const applyMarkdownTool = (action) => {
  if (props.disabled) return

  const toolActions = {
    bold: () => wrapSelectedText({ before: '**', after: '**', placeholder: '太字' }),
    italic: () => wrapSelectedText({ before: '*', after: '*', placeholder: '斜体' }),
    strikethrough: () => wrapSelectedText({ before: '~~', after: '~~', placeholder: '打ち消し線' }),
    link: () => wrapSelectedText({ before: '[', after: '](https://example.com)', placeholder: 'リンクテキスト' }),
    'ordered-list': () => prefixSelectedLines((index) => `${index + 1}. `),
    'unordered-list': () => prefixSelectedLines(() => '- '),
    'code-block': () => wrapSelectedText({ before: '```\n', after: '\n```', placeholder: 'コード' }),
  }

  toolActions[action]?.()
}

const submitMessage = () => {
  if (!canSend.value) return

  emit('submit')
}

const handleTextareaKeydown = (event) => {
  if (event.key !== 'Enter') return

  if (event.isComposing || isComposing.value || event.keyCode === 229) return
  if (!event.metaKey) return

  event.preventDefault()
  submitMessage()
}

const handleCompositionStart = () => {
  isComposing.value = true
}

const handleCompositionEnd = () => {
  isComposing.value = false
  nextTick(() => {
    resizeTextarea()
  })
}

onMounted(() => {
  nextTick(() => {
    resizeTextarea()
  })
})

watch(
  () => props.modelValue,
  () => {
    nextTick(() => {
      resizeTextarea()
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
        :disabled="disabled"
        @click="applyMarkdownTool(tool.action)"
      >
        <component :is="tool.icon" :size="17" class="tool-icon" />
      </button>
    </div>

    <div class="message-content">
      <label class="sr-only" for="message-input">メッセージを入力</label>
      <textarea
        id="message-input"
        ref="textareaRef"
        v-model="message"
        placeholder="独り言を呟こう"
        aria-label="メッセージを入力"
        rows="1"
        :disabled="disabled"
        @input="resizeTextarea"
        @compositionstart="handleCompositionStart"
        @compositionend="handleCompositionEnd"
        @keydown="handleTextareaKeydown"
      />
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
.send-button:focus-visible,
textarea:focus-visible {
  outline: none;
}

.tool-button:active,
.icon-button:active,
.send-button:active {
  transform: scale(0.97);
}

textarea {
  display: block;
  width: 100%;
  min-height: 24px;
  max-height: 240px;
  box-sizing: border-box;
  margin: 0;
  padding: 4px 2px 0;
  border: none;
  outline: none;
  overflow-y: auto;
  resize: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: var(--font-size);
  line-height: 1.5;
}

textarea::placeholder {
  color: var(--icon-muted);
}

textarea:disabled {
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

  textarea {
    min-height: 24px;
  }
}
</style>
