<template>
    <div class="sub-settings-container">
        <h2>Data Management</h2>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStateStore } from '@/stores/appState'

onMounted(() => {
    useAppStateStore().setTitle('Data Management Settings')
})


</script>

<style scoped>
.sub-settings-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
}

h2 {
    margin: 0;
}
</style>
