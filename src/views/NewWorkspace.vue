<template>
    <div class="new-workspace">
        Not implemented yet
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { onMounted, ref } from 'vue';

onMounted(() => {
    useAppStateStore().setTitle('New Workspace');
});


</script>

<style scoped>
.new-workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
}
</style>

