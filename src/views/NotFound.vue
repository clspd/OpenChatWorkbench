<template>
    <div class="not-found">
        <div class="icon">
            <ExclamationCircleTwoTone />
        </div>
        <h1>{{ t('common:page_not_found.title') }}</h1>
        <a-button type="primary" @click="goToNewChat">{{ t('common:page_not_found.newChat') }}</a-button>
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
    useAppStateStore().setTitle('Page Not Found')
})

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
