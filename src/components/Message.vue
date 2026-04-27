<script setup>
import Icon from './Icon.vue'
import { Heart } from '@lucide/vue'

const props = defineProps(['name', 'date', 'message'])

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
    </div>
    <div class="message-actions">
      <Heart :size="20" />
      <Heart :size="20" />
      <Heart :size="20" />
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
