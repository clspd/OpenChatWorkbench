<template>
    <span class="status-text" :data-status="value">{{ value ? activeText : inactiveText }}</span>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
    value: {
        type: Boolean,
        default: false
    },
    activeText: {
        type: String,
        default: 'Active'
    },
    inactiveText: {
        type: String,
        default: 'Inactive'
    },
})
</script>

<style scoped>
.status-text {
    display: inline-block;
    padding: 0.2em 0.5em;
    border-radius: 0.2em;
    color: #fff;
    font-size: 0.8em;
}
.status-text[data-status="true"] {
    background-color: #4caf50;
}
.status-text[data-status="false"] {
    background-color: #f44336;
}
</style>