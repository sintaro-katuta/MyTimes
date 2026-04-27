<script setup>
  const props = defineProps(['src', 'width', 'height'])
  const width = props.width || '48px'
  const height = props.height || '48px'
  const color = props.color || 'var(--text-primary)'
</script>

<template>
  <img class="icon-image" v-if="props.src" :src="props.src" alt="icon" :width="width" :height="height" />
  <div v-else class="icon-placeholder" :style="{ backgroundColor: color }" />
</template>

<style scoped>
.icon-image {
  border-radius: var(--border-radius);
}

.icon-placeholder {
  mask-image: url("../assets/placeholder.svg");
  mask-size: cover;
  mask-position: center;
  mask-repeat: no-repeat;
}
</style>
