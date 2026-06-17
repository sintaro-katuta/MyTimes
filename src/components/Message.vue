<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Plus, UserRound, X } from '@lucide/vue'
import { openUrl } from '@tauri-apps/plugin-opener'
import { markdownToHtml } from '../lib/markdown'

const props = defineProps({
  name: { type: String, required: true },
  avatarSrc: { type: String, default: '' },
  date: { type: String, required: true },
  message: { type: String, required: true },
  reactions: { type: Array, default: () => [] },
  reactionOptions: { type: Array, default: () => [] },
  isReactionPickerOpen: { type: Boolean, default: false },
  isAnyReactionPickerOpen: { type: Boolean, default: false },
})
const emit = defineEmits([
  'toggle-reaction',
  'add-image-reaction',
  'open-reaction-picker',
  'close-reaction-picker',
])

const isReactionSelected = (reactionId) => props.reactions.includes(reactionId)

const activeReactionTooltip = ref(null)
const reactionTooltipPosition = ref({ left: 0, top: 0 })
const messageActionsRef = ref(null)
const emojiPickerRef = ref(null)
const emojiPickerPlacement = ref('below')
const isAvatarLoadFailed = ref(false)

const QUICK_REACTION_IDS = [
  'thumbs_up',
  'heart',
  'eyes',
  'white_check_mark',
]

const uniqueReactionOptions = computed(() =>
  props.reactionOptions.filter((reaction, index, options) =>
    options.findIndex((option) => option.id === reaction.id) === index,
  ),
)

const frequentReactionOptions = computed(() =>
  QUICK_REACTION_IDS
    .map((reactionId) => uniqueReactionOptions.value.find((reaction) => reaction.id === reactionId))
    .filter(Boolean),
)

const selectedReactionOptions = computed(() =>
  props.reactions
    .map((reactionId) => uniqueReactionOptions.value.find((option) => option.id === reactionId))
    .filter(Boolean),
)

const pickerReactionOptions = computed(() =>
  uniqueReactionOptions.value.filter((reaction) => reaction.imageSrc),
)

const isEmojiPickerOpen = computed(() => props.isReactionPickerOpen)

const renderedMessage = computed(() => markdownToHtml(props.message, { includeCodeCopy: true }))

const reactionTooltipStyle = computed(() => ({
  left: `${reactionTooltipPosition.value.left}px`,
  top: `${reactionTooltipPosition.value.top}px`,
}))

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const showReactionTooltip = (reaction, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const tooltipHalfWidth = 110
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth

  activeReactionTooltip.value = reaction
  reactionTooltipPosition.value = {
    left: clamp(rect.left + rect.width / 2, tooltipHalfWidth + 12, viewportWidth - tooltipHalfWidth - 12),
    top: rect.top - 10,
  }
}

const hideReactionTooltip = () => {
  activeReactionTooltip.value = null
}

const updateEmojiPickerPlacement = async () => {
  if (!props.isReactionPickerOpen) return

  await nextTick()

  const actionsElement = messageActionsRef.value
  const pickerElement = emojiPickerRef.value

  if (!actionsElement || !pickerElement) return

  const actionsRect = actionsElement.getBoundingClientRect()
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const boundaryRect = actionsElement.closest('.messages')?.getBoundingClientRect?.()
  const pickerHeight = pickerElement.offsetHeight
  const pickerGap = 8
  const viewportPadding = 12
  const comfortableBottomPadding = 48
  const visibleTop = Math.max(boundaryRect?.top ?? 0, viewportPadding)
  const visibleBottom = Math.min(boundaryRect?.bottom ?? viewportHeight, viewportHeight) - viewportPadding
  const availableBelow = visibleBottom - actionsRect.bottom - pickerGap
  const availableAbove = actionsRect.top - pickerGap - visibleTop
  const hasEnoughRoomBelow = availableBelow >= pickerHeight + comfortableBottomPadding
  const hasMoreRoomAbove = availableAbove > availableBelow

  emojiPickerPlacement.value = !hasEnoughRoomBelow && hasMoreRoomAbove
    ? 'above'
    : 'below'
}

const toggleEmojiPicker = () => {
  if (pickerReactionOptions.value.length === 0) {
    addImageReaction()
    return
  }

  if (props.isReactionPickerOpen) {
    closeEmojiPicker()
    return
  }

  emit('open-reaction-picker')
}

const closeEmojiPicker = () => {
  emit('close-reaction-picker')
}

const toggleReaction = (reactionId) => {
  emit('toggle-reaction', reactionId)
}

const toggleChipReaction = (reactionId) => {
  toggleReaction(reactionId)
  hideReactionTooltip()
}

const togglePickerReaction = (reactionId) => {
  toggleReaction(reactionId)
  closeEmojiPicker()
}

const addImageReaction = () => {
  emit('add-image-reaction')
  closeEmojiPicker()
}

const handleWindowChange = () => {
  updateEmojiPickerPlacement()
}

const handleDocumentPointerDown = (event) => {
  if (!props.isReactionPickerOpen) return

  const pickerElement = emojiPickerRef.value
  const actionsElement = messageActionsRef.value

  if (pickerElement?.contains(event.target)) return
  if (actionsElement?.contains(event.target)) return

  closeEmojiPicker()
}

watch(
  () => props.isReactionPickerOpen,
  (isOpen) => {
    if (isOpen) {
      updateEmojiPickerPlacement()
    }
  },
)

watch(
  () => props.avatarSrc,
  () => {
    isAvatarLoadFailed.value = false
  },
)

const handleMessageClick = async (event) => {
  const copyButton = event.target.closest?.('.code-copy-button')

  if (copyButton) {
    event.preventDefault()

    const code = copyButton.closest('pre')?.querySelector('code')

    if (!code) return

    try {
      await navigator.clipboard.writeText(code.textContent ?? '')
      copyButton.textContent = 'コピー済み'
      window.setTimeout(() => {
        copyButton.textContent = 'コピー'
      }, 1400)
    } catch (error) {
      console.error('コードをコピーできませんでした', error)
      copyButton.textContent = '失敗'
      window.setTimeout(() => {
        copyButton.textContent = 'コピー'
      }, 1400)
    }

    return
  }

  const link = event.target.closest?.('a[href]')

  if (!link) return

  event.preventDefault()

  try {
    await openUrl(link.href)
  } catch (error) {
    console.error('リンクを開けませんでした', error)
  }
}

onMounted(() => {
  window.addEventListener('resize', handleWindowChange)
  window.addEventListener('scroll', handleWindowChange, true)
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowChange)
  window.removeEventListener('scroll', handleWindowChange, true)
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<template>
  <div
    class="message"
    :class="{
      'is-picker-open': isEmojiPickerOpen,
      'is-reaction-hover-suppressed': props.isAnyReactionPickerOpen && !props.isReactionPickerOpen,
    }"
  >
    <div class="message-avatar" aria-hidden="true">
      <img
        v-if="props.avatarSrc && !isAvatarLoadFailed"
        :src="props.avatarSrc"
        alt=""
        @error="isAvatarLoadFailed = true"
      />
      <UserRound v-else :size="22" />
    </div>
    <div class="message-body">
      <div class="message-info">
        <p class="message-name">{{ props.name }}</p>
        <p class="message-date">{{ props.date }}</p>
      </div>
      <div class="message-content" @click="handleMessageClick">
        <div class="message-message" v-html="renderedMessage"></div>
      </div>
      <div v-if="props.reactions.length > 0" class="message-reactions" aria-label="選択中のリアクション">
        <button
          v-for="reaction in selectedReactionOptions"
          :key="reaction.id"
          type="button"
          class="reaction-chip"
          :class="{ active: isReactionSelected(reaction.id) }"
          :aria-label="`${reaction.label}リアクションを解除`"
          @mouseenter="showReactionTooltip(reaction, $event)"
          @mouseleave="hideReactionTooltip"
          @focus="showReactionTooltip(reaction, $event)"
          @blur="hideReactionTooltip"
          @click="toggleChipReaction(reaction.id)"
        >
          <img
            v-if="reaction.imageSrc"
            class="reaction-image"
            :src="reaction.imageSrc"
            alt=""
            aria-hidden="true"
          />
          <span v-else class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
          <span class="reaction-count">1</span>
        </button>
      </div>
    </div>
    <div
      ref="messageActionsRef"
      class="message-actions"
      :inert="props.isAnyReactionPickerOpen && !props.isReactionPickerOpen"
    >
      <button
        v-for="reaction in frequentReactionOptions"
        :key="reaction.id"
        type="button"
        class="reaction-button"
        :class="{ active: isReactionSelected(reaction.id) }"
        :aria-pressed="isReactionSelected(reaction.id)"
        :aria-label="`${reaction.label}リアクションを切り替え`"
        :title="reaction.label"
        @click="toggleReaction(reaction.id)"
      >
        <img
          v-if="reaction.imageSrc"
          class="reaction-image"
          :src="reaction.imageSrc"
          alt=""
          aria-hidden="true"
        />
        <span v-else class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
      </button>
      <button
        type="button"
        class="reaction-button add-reaction-button"
        :class="{ active: isEmojiPickerOpen }"
        :aria-expanded="isEmojiPickerOpen"
        aria-label="他の絵文字を追加"
        title="他の絵文字"
        @click="toggleEmojiPicker"
      >
        <Plus :size="18" aria-hidden="true" />
      </button>
      <div
        v-if="isEmojiPickerOpen"
        ref="emojiPickerRef"
        class="emoji-picker"
        :class="`is-${emojiPickerPlacement}`"
        role="dialog"
        aria-label="絵文字を選択"
      >
        <div class="emoji-picker-header">
          <p class="emoji-picker-title">絵文字</p>
          <button type="button" class="emoji-picker-close" aria-label="閉じる" @click="closeEmojiPicker">
            <X :size="18" aria-hidden="true" />
          </button>
        </div>
        <p v-if="pickerReactionOptions.length > 0" class="emoji-picker-section-title">カスタム</p>
        <div
          v-if="pickerReactionOptions.length > 0"
          class="emoji-grid"
          role="listbox"
          aria-label="カスタム画像リアクション一覧"
        >
          <button
            v-for="reaction in pickerReactionOptions"
            :key="reaction.id"
            type="button"
            class="emoji-grid-button"
            :class="{ active: isReactionSelected(reaction.id) }"
            :aria-label="`${reaction.label}リアクションを切り替え`"
            :title="reaction.label"
            role="option"
            :aria-selected="isReactionSelected(reaction.id)"
            @click="togglePickerReaction(reaction.id)"
          >
            <img
              class="reaction-image"
              :src="reaction.imageSrc"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
        <div class="emoji-custom-entry">
          <button
            type="button"
            class="emoji-custom-add"
            @click="addImageReaction"
          >
            絵文字を追加する
          </button>
        </div>
      </div>
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="activeReactionTooltip"
      class="reaction-tooltip"
      :style="reactionTooltipStyle"
      role="tooltip"
    >
      <img
        v-if="activeReactionTooltip.imageSrc"
        class="reaction-tooltip-image"
        :src="activeReactionTooltip.imageSrc"
        alt=""
        aria-hidden="true"
      />
      <span v-else class="reaction-tooltip-emoji" aria-hidden="true">{{ activeReactionTooltip.emoji }}</span>
      <span class="reaction-tooltip-text">
        あなたが :{{ activeReactionTooltip.label }}: でリアクションしました（クリックして削除）
      </span>
    </div>
  </Teleport>
</template>

<style scoped>
.message {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: flex-start;
  overflow: visible;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-overlay) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-default) 72%, transparent);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow: var(--shadow-panel);
  transition:
    background-color 180ms ease;
  border-radius: 16px;
  padding: 18px 20px;
  gap: 12px;
}

.message:hover,
.message:focus-within {
  z-index: 20;
}

.message.is-reaction-hover-suppressed:hover,
.message.is-reaction-hover-suppressed:focus-within {
  z-index: 0;
}

.message.is-picker-open {
  z-index: 100;
}

.message-avatar {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border-default) 82%, transparent);
  border-radius: 50%;
  color: var(--icon-default);
  background:
    radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--bg-primary) 30%, transparent), transparent 34%),
    var(--surface-accent);
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding-right: 88px;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
}

.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
}

.reaction-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 3px 9px;
  border: 1px solid color-mix(in srgb, var(--border-default) 82%, transparent);
  border-radius: 999px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-elevated) 90%, transparent);
  font-size: 12px;
  line-height: 1;
  box-shadow: var(--shadow-soft);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.reaction-tooltip {
  position: fixed;
  z-index: 5000;
  display: flex;
  width: min(220px, calc(100vw - 40px));
  min-height: 88px;
  padding: 12px 14px 14px;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  color: var(--text-primary);
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  box-shadow: var(--shadow-modal);
  pointer-events: none;
  transform: translate(-50%, -100%);
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.reaction-tooltip::after {
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 12px;
  height: 12px;
  content: '';
  background: var(--surface-panel);
  border-right: 1px solid var(--border-default);
  border-bottom: 1px solid var(--border-default);
  transform: translateX(-50%) rotate(45deg);
}

.reaction-tooltip-image,
.reaction-tooltip-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--surface-elevated);
}

.reaction-tooltip-image {
  object-fit: contain;
}

.reaction-tooltip-emoji {
  font-family:
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Noto Color Emoji',
    sans-serif;
  font-size: 34px;
  line-height: 1;
}

.reaction-tooltip-text {
  max-width: 100%;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  white-space: normal;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.reaction-chip:hover,
.reaction-chip:focus-visible {
  border-color: color-mix(in srgb, var(--bg-primary) 36%, var(--border-default));
  background: color-mix(in srgb, var(--surface-accent) 78%, transparent);
  outline: none;
}

.reaction-chip:active {
  transform: scale(0.97);
}

.reaction-emoji {
  font-family:
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Noto Color Emoji',
    sans-serif;
  font-size: 16px;
  line-height: 1;
}

.reaction-image {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
}

.reaction-count {
  min-width: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.message-info {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.message-content {
  display: flex;
  width: 100%;
  text-align: left;
}

.message-name {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}

.message-date {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}

.message-message {
  display: block;
  width: 100%;
  font-size: 15px;
  margin: 0;
  line-height: 1.6;
  word-break: break-word;
  color: var(--text-secondary);
}

.message-message :deep(p),
.message-message :deep(ul),
.message-message :deep(ol),
.message-message :deep(pre),
.message-message :deep(blockquote),
.message-message :deep(h1),
.message-message :deep(h2),
.message-message :deep(h3) {
  margin: 0;
}

.message-message :deep(p + p),
.message-message :deep(p + ul),
.message-message :deep(p + ol),
.message-message :deep(ul + p),
.message-message :deep(ol + p),
.message-message :deep(pre + p),
.message-message :deep(p + pre),
.message-message :deep(blockquote + p),
.message-message :deep(p + blockquote),
.message-message :deep(h1 + p),
.message-message :deep(h2 + p),
.message-message :deep(h3 + p) {
  margin-top: 8px;
}

.message-message :deep(h1),
.message-message :deep(h2),
.message-message :deep(h3) {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.35;
}

.message-message :deep(h1) {
  font-size: 18px;
}

.message-message :deep(h2) {
  font-size: 17px;
}

.message-message :deep(h3) {
  font-size: 16px;
}

.message-message :deep(ul),
.message-message :deep(ol) {
  padding-left: 1.35em;
}

.message-message :deep(li + li) {
  margin-top: 2px;
}

.message-message :deep(strong) {
  color: var(--text-primary);
  font-weight: 700;
}

.message-message :deep(em) {
  font-style: italic;
}

.message-message :deep(s) {
  color: var(--text-tertiary);
}

.message-message :deep(a) {
  color: var(--bg-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.message-message :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  color: var(--text-primary);
  background: var(--surface-toolbar);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92em;
}

.message-message :deep(pre) {
  position: relative;
  max-width: 100%;
  overflow-x: auto;
  padding: 32px 12px 10px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background: var(--surface-toolbar);
}

.message-message :deep(pre[data-language]::before) {
  content: attr(data-language);
  position: absolute;
  top: 7px;
  left: 10px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1;
  text-transform: uppercase;
}

.message-message :deep(.code-copy-button) {
  position: absolute;
  top: 5px;
  right: 8px;
  min-width: 54px;
  min-height: 24px;
  padding: 4px 8px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-tertiary);
  background: color-mix(in srgb, var(--surface-panel) 80%, transparent);
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
}

.message-message :deep(.code-copy-button:hover),
.message-message :deep(.code-copy-button:focus-visible) {
  color: var(--text-primary);
  background: var(--surface-elevated);
  outline: none;
}

.message-message :deep(pre code) {
  display: block;
  padding: 0;
  background: transparent;
  white-space: pre;
}

.message-message :deep(pre code.hljs) {
  color: #c9d1d9;
}

.message-message :deep(blockquote) {
  padding-left: 10px;
  border-left: 3px solid var(--border-strong);
  color: var(--text-tertiary);
}

.message-actions {
  position: absolute;
  padding: 6px 10px;
  top: 0;
  right: 8px;
  border: 1px solid color-mix(in srgb, var(--border-default) 76%, transparent);
  border-radius: 14px;
  z-index: 30;
  opacity: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  backdrop-filter: blur(14px) saturate(130%);
  -webkit-backdrop-filter: blur(14px) saturate(130%);
  box-shadow: var(--shadow-soft);
  transition:
    opacity 160ms ease,
    transform 160ms ease;
  transform: translateY(calc(-50% - 4px));
}

.message:hover .message-actions,
.message:focus-within .message-actions,
.message.is-picker-open .message-actions {
  opacity: 1;
  transform: translateY(-50%);
}

.message.is-reaction-hover-suppressed:hover .message-actions,
.message.is-reaction-hover-suppressed:focus-within .message-actions {
  opacity: 0;
  pointer-events: none;
  transform: translateY(calc(-50% - 4px));
}

.message-actions :deep(img) {
  cursor: pointer;
  opacity: 0.82;
  transition: opacity 160ms ease;
}

.message-actions :deep(img:hover) {
  opacity: 1;
}

.reaction-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  color: var(--icon-default);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.reaction-button .reaction-emoji {
  font-size: 18px;
}

.reaction-button:hover,
.reaction-button:focus-visible {
  color: var(--text-primary);
  background: var(--surface-elevated-hover);
  outline: none;
}

.reaction-button.active {
  color: var(--text-primary);
  border-color: transparent;
  background: transparent;
}

.reaction-button:active {
  transform: scale(0.96);
}

.emoji-picker {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: min(360px, calc(100vw - 32px));
  max-height: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border-default) 82%, transparent);
  border-radius: 12px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-panel) 98%, transparent);
  box-shadow: var(--shadow-modal);
}

.emoji-picker.is-above {
  top: auto;
  bottom: calc(100% + 8px);
}

.emoji-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.emoji-picker-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.emoji-picker-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  color: var(--icon-default);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.emoji-picker-close:hover,
.emoji-picker-close:focus-visible {
  color: var(--text-primary);
  background: var(--surface-elevated-hover);
  outline: none;
}

.emoji-custom-entry {
  padding: 12px;
  border-top: 1px solid var(--border-subtle);
}

.emoji-custom-add {
  min-height: 40px;
  padding: 0 12px;
  color: var(--text-primary);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.emoji-custom-add:hover,
.emoji-custom-add:focus-visible {
  background: var(--surface-elevated-hover);
  outline: none;
}

.emoji-picker-section-title {
  margin: 10px 12px 8px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 700;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
  padding: 0 12px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.emoji-grid-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-width: 0;
  min-height: 36px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}

.emoji-grid-button .reaction-image {
  width: 24px;
  height: 24px;
}

.emoji-grid-button:hover,
.emoji-grid-button:focus-visible {
  background: var(--surface-elevated-hover);
  outline: none;
}

.emoji-grid-button.active {
  border-color: color-mix(in srgb, var(--bg-primary) 40%, var(--border-default));
  background: color-mix(in srgb, var(--surface-accent) 84%, transparent);
}

@media (max-width: 640px) {
  .message {
    padding: 16px;
  }

  .message-body {
    padding-right: 0;
  }

  .message-actions {
    top: 0;
    right: 8px;
    opacity: 1;
    transform: translateY(-50%);
  }

  .emoji-picker {
    right: -8px;
    width: min(320px, calc(100vw - 24px));
  }

  .emoji-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
</style>
