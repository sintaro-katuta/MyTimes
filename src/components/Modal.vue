<script setup>
import { CircleX } from '@lucide/vue'
import { useSlots } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'default',
  },
})

const emit = defineEmits(['update:modelValue', 'close'])
const slots = useSlots()

const closeModal = () => {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <Transition name="modal-fade">
    <div
      v-if="props.modelValue"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="モーダルダイアログ"
      @click.self="closeModal"
    >
      <div class="modal-backdrop" aria-hidden="true" @click="closeModal" />
      <div class="modal-shell" :class="`modal-shell-${props.size}`">
        <div class="modal-content">
          <button type="button" class="close-button" aria-label="モーダルを閉じる" @click="closeModal">
            <CircleX size="24" class="close" />
          </button>

          <header v-if="slots.header" class="modal-header">
            <slot name="header" :close="closeModal" />
          </header>

          <div v-if="slots.body" class="modal-body">
            <slot name="body" :close="closeModal" />
          </div>

          <footer v-if="slots.footer" class="modal-footer">
            <slot name="footer" :close="closeModal" />
          </footer>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(8px);
}

.modal-shell {
  position: relative;
  width: min(680px, 100%);
}

.modal-shell-wide {
  width: min(70vw, calc(100vw - 32px));
  height: min(70dvh, calc(100dvh - 32px));
}

.modal-shell-wide .modal-content {
  height: 100%;
}

.modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 32px);
  overflow: hidden;
  background: linear-gradient(180deg, var(--surface-overlay), var(--surface-overlay-muted));
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  box-shadow: var(--shadow-modal);
}

.modal-header,
.modal-body,
.modal-footer {
  padding-left: 24px;
  padding-right: 24px;
}

.modal-header {
  padding-top: 24px;
  padding-bottom: 16px;
  padding-right: 72px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-body {
  padding-top: 20px;
  padding-bottom: 24px;
  overflow-y: auto;
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  padding-bottom: 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-overlay-muted);
}

.close-button {
  position: absolute;
  top: 18px;
  right: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--icon-default);
  transition:
    color 180ms ease,
    transform 180ms ease;
}

.close-button:hover {
  color: var(--text-primary);
}

.close-button:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}

.close-button:active {
  transform: scale(0.96);
}

.close {
  display: block;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 180ms ease;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 640px) {
  .modal {
    padding: 12px;
  }

  .modal-content {
    max-height: calc(100dvh - 24px);
    border-radius: 18px;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .modal-header {
    padding-top: 20px;
    padding-right: 60px;
  }

  .modal-body {
    padding-top: 16px;
    padding-bottom: 20px;
  }

  .modal-footer {
    padding-top: 14px;
    padding-bottom: 18px;
  }
}

</style>
