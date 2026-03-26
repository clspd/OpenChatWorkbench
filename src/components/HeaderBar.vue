<template>
    <div class="header-bar" :class="{'large-screen': windowState.isLargeScreen}">
        <template v-if="windowState.isLargeScreen">
            <!-- 大屏幕显示对话标题和对话设置按钮 -->
            <div class="s-tl-extra" :style="{ visibility: appStatePersist.sidebarCollapsed ? 'visible' : 'hidden' }" :aria-hidden="!appStatePersist.sidebarCollapsed">
                <AppLogo :size="16" />
                <div class="btn-group">
                    <!-- 浮动的“展开”按钮（桌面端） -->
                    <a-button type="text" shape="circle"
                        :aria-label="t('common:ui.header.expBtn')"
                        @click="appStatePersist.sidebarCollapsed = !appStatePersist.sidebarCollapsed">
                        <CaretRightFilled />
                    </a-button>
                    <!-- 新对话（桌面端） -->
                    <a-button type="text" shape="circle" @click="newChat" :aria-label="t('common:ui.header.moreOptions.newConv')">
                        <PlusCircleOutlined />
                    </a-button>
                </div>
            </div>

	    <div class="s-tl-extra-lg-screen-fill"></div>

            <div class="flexible-space"></div>
            <div class="title-text">{{ (appState.titleCustomize || appState.titleNoTranslate) ? appState.title : t(GetTitleI18nKeyByText(appState.title)) }}</div>
            <div class="flexible-space"></div>
            <HeaderMoreOptions />
        </template>
        <template v-else>
            <!-- 小屏幕显示（常驻）菜单展开按钮和新建对话按钮 -->
            <a-button shape="circle" type="text" @click="appStatePersist.sidebarCollapsed = !appStatePersist.sidebarCollapsed" :aria-label="t('common:ui.header.expBtn')">
                <CaretRightFilled />
            </a-button>
            <div class="flexible-space"></div>
            <a-button shape="circle" type="text" @click="newChat" :aria-label="t('common:ui.header.moreOptions.newConv')">
                <PlusCircleOutlined />
            </a-button>
            <HeaderMoreOptions />
        </template>
    </div>
</template>

<script setup lang="ts">
import { useAppStateStore } from '@/stores/appState';
import { useWindowStateStore } from '@/stores/windowState';
import { useAppStatePersistStore } from '@/stores/appStatePersist';
import { useRouter } from 'vue-router';
import HeaderMoreOptions from './HeaderMoreOptions.vue';
import { GetTitleI18nKeyByText } from '@/i18n/titles';

const appState = useAppStateStore();
const windowState = useWindowStateStore();
const appStatePersist = useAppStatePersistStore();

const router = useRouter();

const newChat = () => {
    router.push('/')
}

</script>

<style scoped>
.header-bar {
    display: flex;
    align-items: center;
    padding: 0.5em;
}
.header-bar.large-screen {
    padding: 1em;
}
.s-tl-extra {
    position: absolute;
    top: 0;
    left: 0;
    margin: 1em;
    z-index: 1;
    display: flex;
    align-items: center;
}
.s-tl-extra > * + * {
    margin-left: 14px;
}
.s-tl-extra > .btn-group {
    border: 1px solid var(--split-border-color);
    border-radius: 100px;
    padding: 2px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    border-radius: 100px;
    background: var(--background);
}
.s-tl-extra-lg-screen-fill {
    width: 100px;
}
.title-text {
    font-weight: bold;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    text-align: center;
}
</style>
