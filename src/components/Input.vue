<script setup>
import { Search } from '@lucide/vue'
</script>

<template>
  <div class="input-wrapper">
    <Search :size="16" class="input-icon" />
    <input type="text" placeholder="検索">
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
  padding: 16px 16px 16px 44px;
  box-sizing: border-box;
}

.input-icon {
  position: absolute;
  top: 50%;
  left: 16px;
  transform: translateY(-50%);
  color: var(--icon-muted);
  pointer-events: none;
}
</style>
