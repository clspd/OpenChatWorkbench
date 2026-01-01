<template>
  <div class="not-found">
    <div class="icon">
      <ExclamationCircleTwoTone />
    </div>
    <h1>页面不存在</h1>
    <a-button type="primary" @click="goToNewChat">新对话</a-button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToNewChat = () => {
  router.push('/')
}
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 20px;
}

.icon {
  font-size: 5em;
}

h1 {
  font-size: 2em;
  color: #333;
  margin: 0;
}
</style>
