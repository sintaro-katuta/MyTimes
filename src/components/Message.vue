<script setup>
import { computed, ref } from 'vue'
import { Plus, X } from '@lucide/vue'
import Icon from './Icon.vue'

const props = defineProps({
  name: { type: String, required: true },
  date: { type: String, required: true },
  message: { type: String, required: true },
  reactions: { type: Array, default: () => [] },
  reactionOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['toggle-reaction', 'add-image-reaction'])

const isReactionSelected = (reactionId) => props.reactions.includes(reactionId)

const isEmojiPickerOpen = ref(false)

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

const toggleEmojiPicker = () => {
  isEmojiPickerOpen.value = !isEmojiPickerOpen.value
}

const closeEmojiPicker = () => {
  isEmojiPickerOpen.value = false
}

const toggleReaction = (reactionId, closePicker = false) => {
  emit('toggle-reaction', reactionId)

  if (closePicker) {
    closeEmojiPicker()
  }
}

const addImageReaction = () => {
  emit('add-image-reaction')
  closeEmojiPicker()
}
</script>

<template>
  <div class="message" :class="{ 'is-picker-open': isEmojiPickerOpen }">
    <Icon src="./example1.jpg" />
    <div class="message-body">
      <div class="message-info">
        <p class="message-name">{{ props.name }}</p>
        <p class="message-date">{{ props.date }}</p>
      </div>
      <div class="message-content">
        <p class="message-message">{{ props.message }}</p>
      </div>
      <div v-if="props.reactions.length > 0" class="message-reactions" aria-label="選択中のリアクション">
        <button
          v-for="reaction in selectedReactionOptions"
          :key="reaction.id"
          type="button"
          class="reaction-chip"
          :class="{ active: isReactionSelected(reaction.id) }"
          :title="reaction.label"
          :aria-label="`${reaction.label}リアクションを解除`"
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
          <span class="reaction-count">1</span>
        </button>
      </div>
    </div>
    <div class="message-actions">
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
      <div v-if="isEmojiPickerOpen" class="emoji-picker" role="dialog" aria-label="絵文字を選択">
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
            @click="toggleReaction(reaction.id, true)"
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

.message.is-picker-open {
  z-index: 100;
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
.message:focus-within .message-actions {
  opacity: 1;
  transform: translateY(-50%);
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
