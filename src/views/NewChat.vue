<template>
    <div class="new-chat-view">
        <h2 style="margin-top: 0;">How can I assist with you today?</h2>
        <InputMessage v-model="userMessage" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import InputMessage from '@/components/InputMessage.vue'

const userMessage = ref('')


</script>

<style scoped>
.new-chat-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1em;
}
</style>
