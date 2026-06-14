<script setup>
import { Search, X } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '検索',
  },
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (event) => {
  emit('update:modelValue', event.target.value)
}

const clearValue = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="input-wrapper">
    <Search :size="16" class="input-icon" />
    <input
      type="search"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      aria-label="検索"
      @input="updateValue"
    >
    <button
      v-if="props.modelValue"
      type="button"
      class="clear-button"
      aria-label="検索条件をクリア"
      @click="clearValue"
    >
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.input-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background-color: var(--bg-input);
  color: var(--text-tertiary);
  font-size: var(--input-font-size);
  border-radius: 8px;
  padding: 16px 44px;
  box-sizing: border-box;
}

input::-webkit-search-cancel-button {
  appearance: none;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  color: var(--icon-muted);
  pointer-events: none;
}

.clear-button {
  position: absolute;
  top: 50%;
  right: 10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--icon-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.clear-button:hover {
  background: var(--bg-base-3);
  color: var(--text-primary);
}
</style>
