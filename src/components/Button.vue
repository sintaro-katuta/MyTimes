<script setup>
defineProps(['color'])

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}

</script>

<template>
  <button type="button" :class="`bg-${color}`" @click="handleClick">
    <slot />
  </button>
</template>

<style scoped>
button {
  width: 100%;
  padding: 8px 16px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size);
}
</style>
