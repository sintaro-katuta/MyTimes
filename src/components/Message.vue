<script setup>
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
</script>

<template>
  <div class="message">
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
        <span
          v-for="reaction in props.reactionOptions.filter((option) => isReactionSelected(option.id))"
          :key="reaction.id"
          class="reaction-chip"
          :title="reaction.label"
        >
          <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
          <span class="reaction-count">1</span>
        </span>
      </div>
    </div>
    <div class="message-actions">
      <button
        v-for="reaction in props.reactionOptions"
        :key="reaction.id"
        type="button"
        class="reaction-button"
        :class="{ active: isReactionSelected(reaction.id) }"
        :aria-pressed="isReactionSelected(reaction.id)"
        :aria-label="`${reaction.label}リアクションを切り替え`"
        :title="reaction.label"
        @click="emit('toggle-reaction', reaction.id)"
      >
        <span class="reaction-emoji" aria-hidden="true">{{ reaction.emoji }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.message {
  position: relative;
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
  z-index: 10;
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

.message:hover .message-actions {
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
  }
}
</style>
