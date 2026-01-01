<script setup lang="ts">
import { ref } from 'vue'
import { Menu, Button, Avatar, Drawer } from 'ant-design-vue'
import { PlusOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const collapsed = ref(false)
const drawerVisible = ref(false)

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value
}

const createNewConversation = () => {
  chatStore.createConversation()
  drawerVisible.value = false
}

const switchConversation = (conversationId: string) => {
  chatStore.switchConversation(conversationId)
  drawerVisible.value = false
}
</script>

<template>
  <!-- 桌面端侧边栏 -->
  <div class="sidebar-wrapper" :class="{ collapsed }">
    <div class="sidebar-container">
      <div class="sidebar-header">
        <div class="logo">
          <img src="@/assets/logo.svg" alt="Logo" width="40" height="40" />
          <span v-if="!collapsed">OpenChat</span>
        </div>
        <Button 
          type="primary" 
          :icon="PlusOutlined" 
          block 
          class="new-conversation-btn"
          @click="createNewConversation"
        >
          <span v-if="!collapsed">新对话</span>
        </Button>
      </div>
      
      <div class="conversation-list">
        <Menu
          :selected-keys="chatStore.activeConversationId ? [chatStore.activeConversationId] : []"
          mode="inline"
          theme="dark"
          :inline-collapsed="collapsed"
          style="height: 100%; border-right: 0"
        >
          <Menu.Item 
            v-for="conv in chatStore.conversations" 
            :key="conv.id" 
            @click="switchConversation(conv.id)"
          >
            {{ conv.title }}
          </Menu.Item>
        </Menu>
      </div>
      
      <div class="sidebar-footer">
        <div class="user-info">
          <Avatar :icon="UserOutlined" />
          <span v-if="!collapsed">用户</span>
        </div>
        <Button 
          :icon="SettingOutlined" 
          type="text"
          style="color: rgba(255, 255, 255, 0.65)"
        />
      </div>
    </div>
  </div>
  
  <!-- 移动端折叠按钮 -->
  <div class="mobile-toggle" @click="toggleDrawer">
    <Button type="primary" shape="circle" :icon="PlusOutlined" />
  </div>
  
  <!-- 移动端抽屉 -->
  <Drawer
    v-model:open="drawerVisible"
    title="OpenChat"
    placement="left"
    :width="300"
  >
    <div class="sidebar-container">
      <div class="sidebar-header">
        <div class="logo">
          <img src="@/assets/logo.svg" alt="Logo" width="40" height="40" />
          <span>OpenChat</span>
        </div>
        <Button 
          type="primary" 
          :icon="PlusOutlined" 
          block 
          class="new-conversation-btn"
          @click="createNewConversation"
        >
          新对话
        </Button>
      </div>
      
      <div class="conversation-list">
        <Menu
          :selected-keys="chatStore.activeConversationId ? [chatStore.activeConversationId] : []"
          mode="inline"
          theme="dark"
          style="height: 100%; border-right: 0"
        >
          <Menu.Item 
            v-for="conv in chatStore.conversations" 
            :key="conv.id" 
            @click="switchConversation(conv.id)"
          >
            {{ conv.title }}
          </Menu.Item>
        </Menu>
      </div>
      
      <div class="sidebar-footer">
        <div class="user-info">
          <Avatar :icon="UserOutlined" />
          <span>用户</span>
        </div>
        <Button 
          :icon="SettingOutlined" 
          type="text"
          style="color: rgba(255, 255, 255, 0.65)"
        />
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.sidebar-wrapper {
  width: 280px;
  height: 100vh;
  background-color: #001529;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.sidebar-wrapper.collapsed {
  width: 80px;
}

.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.sidebar-header {
  margin-bottom: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px;
}

.logo span {
  font-size: 18px;
  font-weight: bold;
}

.new-conversation-btn {
  margin-bottom: 16px;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-toggle {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 1000;
  display: none;
}

@media (max-width: 768px) {
  .sidebar-wrapper {
    display: none;
  }
  
  .mobile-toggle {
    display: block;
  }
}
</style>