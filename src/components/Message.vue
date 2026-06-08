<script setup>
import { computed, ref } from 'vue'
import { Plus, Search, X } from '@lucide/vue'
import Icon from './Icon.vue'

const props = defineProps({
  name: { type: String, required: true },
  date: { type: String, required: true },
  message: { type: String, required: true },
  reactions: { type: Array, default: () => [] },
  reactionOptions: { type: Array, default: () => [] },
})
const emit = defineEmits(['toggle-reaction'])

const isReactionSelected = (reactionId) => props.reactions.includes(reactionId)

const isEmojiPickerOpen = ref(false)
const emojiSearchQuery = ref('')
const activeEmojiCategory = ref('popular')

const EMOJI_CATEGORIES = [
  { id: 'popular', label: 'よく使う', match: ['smile', 'heart', 'thumbs_up', 'joy', 'eyes', 'clap', 'pray', 'tada', 'white_check_mark'] },
  { id: 'all', label: 'すべて', match: null },
  { id: 'face', label: 'スマイル', match: ['smile', 'joy', 'sweat_smile', 'sob', 'relieved', 'blush', 'smile_open', 'wink', 'heart_eyes', 'partying', 'thinking', 'exploding_head', 'salute', 'neutral', 'zipper', 'sleeping', 'skull', 'poop'] },
  { id: 'work', label: '仕事', match: ['white_check_mark', 'eyes', 'pray', 'clap', 'idea', 'rocket', 'memo', 'warning', 'question', 'target', 'loudspeaker', 'calendar', 'hourglass', 'bug', 'gear', 'lock', 'link', 'chart', 'package', 'book', 'computer', 'phone', 'paint', 'camera', 'money'] },
  { id: 'symbol', label: '記号', match: ['heart', '100', 'sparkles', 'boom', 'zap', 'fire', 'star', 'green_circle', 'yellow_circle', 'red_circle', 'blue_circle', 'black_circle', 'white_circle'] },
]

const uniqueReactionOptions = computed(() =>
  props.reactionOptions.filter((reaction, index, options) =>
    options.findIndex((option) => option.id === reaction.id) === index,
  ),
)

const frequentReactionOptions = computed(() => uniqueReactionOptions.value.slice(0, 3))

const selectedReactionOptions = computed(() =>
  props.reactions
    .map((reactionId) => uniqueReactionOptions.value.find((option) => option.id === reactionId))
    .filter(Boolean),
)

const filteredReactionOptions = computed(() => {
  const query = emojiSearchQuery.value.trim().toLowerCase()

  if (query) {
    return uniqueReactionOptions.value.filter((reaction) =>
      `${reaction.emoji} ${reaction.label} ${reaction.id}`.toLowerCase().includes(query),
    )
  }

  const category = EMOJI_CATEGORIES.find((item) => item.id === activeEmojiCategory.value)
  if (!category) return uniqueReactionOptions.value
  if (category.match === null) return uniqueReactionOptions.value

  return category.match
    .map((reactionId) => uniqueReactionOptions.value.find((reaction) => reaction.id === reactionId))
    .filter(Boolean)
})

const toggleEmojiPicker = () => {
  isEmojiPickerOpen.value = !isEmojiPickerOpen.value
}

const closeEmojiPicker = () => {
  isEmojiPickerOpen.value = false
  emojiSearchQuery.value = ''
}

const toggleReaction = (reactionId, closePicker = false) => {
  emit('toggle-reaction', reactionId)

  if (closePicker) {
    closeEmojiPicker()
  }
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
          <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
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
        <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
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
        <div class="emoji-category-tabs" role="tablist" aria-label="絵文字カテゴリ">
          <button
            v-for="category in EMOJI_CATEGORIES"
            :key="category.id"
            type="button"
            class="emoji-category-tab"
            :class="{ active: activeEmojiCategory === category.id && !emojiSearchQuery }"
            :aria-selected="activeEmojiCategory === category.id && !emojiSearchQuery"
            role="tab"
            @click="activeEmojiCategory = category.id"
          >
            {{ category.label }}
          </button>
        </div>
        <label class="emoji-search">
          <Search :size="16" aria-hidden="true" />
          <input
            v-model="emojiSearchQuery"
            type="search"
            placeholder="絵文字を検索"
            aria-label="絵文字を検索"
          />
        </label>
        <div class="emoji-grid" role="listbox" aria-label="絵文字一覧">
          <button
            v-for="reaction in filteredReactionOptions"
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
            <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
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
  border-color: color-mix(in srgb, var(--bg-primary) 38%, var(--border-default));
  background: color-mix(in srgb, var(--surface-accent) 84%, transparent);
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

.emoji-category-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
  overflow-x: auto;
}

.emoji-category-tab {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 10px;
  color: var(--text-tertiary);
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.emoji-category-tab:hover,
.emoji-category-tab:focus-visible {
  color: var(--text-primary);
  background: var(--surface-elevated-hover);
  outline: none;
}

.emoji-category-tab.active {
  color: var(--bg-primary);
  background: color-mix(in srgb, var(--surface-accent) 84%, transparent);
}

.emoji-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin: 10px 12px;
  padding: 0 12px;
  color: var(--text-tertiary);
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-input);
}

.emoji-search:focus-within {
  border-color: var(--bg-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bg-primary) 18%, transparent);
}

.emoji-search input {
  width: 100%;
  min-width: 0;
  padding: 0;
  color: var(--text-primary);
  background: transparent;
  border: 0;
  outline: none;
  font: inherit;
  font-size: 14px;
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

.emoji-grid-button .reaction-emoji {
  font-size: 22px;
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
