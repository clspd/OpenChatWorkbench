<template>
    <img src="/favicon.ico" alt="App" :width="size" :height="size" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
    size: {
        type: Number,
        default: 32
    },
})

</script>
