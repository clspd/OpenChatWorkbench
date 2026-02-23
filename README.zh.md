# Open Chat Workbench

[English](README.md) | 中文

Open Chat Workbench 是一款功能强大的开源聊天应用程序，旨在为与不同提供商的各种 AI 模型交互提供一个统一的界面。它提供无缝的用户体验，并具备管理对话、工作空间和自定义 AI 交互的高级功能。

## 主要特性

- **多提供商支持**：集成多个 AI 提供商，包括 OpenAI、Anthropic、Gemini、DeepSeek 和阿里云
- **对话管理**：创建、组织和管理对话，具备高级线程功能
- **工作空间组织**（即将推出）：将相关对话分组到工作空间中，以便更好地组织
- **富文本编辑器**：使用 Tiptap 增强消息输入，提供格式化选项
- **Markdown 支持**：在消息中渲染 Markdown 内容，提高可读性
- **文件附件**：支持在对话中上传和共享文件
- **国际化**：内置支持英语和中文
- **数据导入/导出**：轻松在不同实例之间传输对话
- **可自定义设置**：微调模型参数、提供商配置和 UI 偏好设置

## 快速开始

### 在线部署

本项目[可在线访问](https://chat.openchatworkbench.com)！您只需访问该网站并配置您的提供商即可。

### 开发

#### 先决条件

- Node.js ^20.19.0 || >=22.12.0
- pnpm 包管理器

#### 安装

1. 克隆仓库
   ```bash
   git clone https://github.com/shc0743/OpenChatWorkbench.git
   cd OpenChatWorkbench
   ```

2. 安装依赖
   ```bash
   pnpm install
   ```

3. 启动开发服务器
   ```bash
   pnpm dev
   ```

4. 构建生产版本
   ```bash
   pnpm build
   ```

## 支持的 AI 模型

Open Chat Workbench 支持使用以下协议的 API：

- **OpenAI**：目前完全支持 `Chat.Completion` API；稍后将添加对 `Responses` API 的支持
- **Anthropic**：部分支持 Anthropic API
- **Gemini**：部分支持 Gemini API

## 贡献

欢迎贡献！请随时提交 Pull Request 或打开 Issue 来报告错误或建议功能。

### 开发指南

1. 遵循现有的代码风格和结构
2. 编写清晰、简洁的提交信息
3. 彻底测试您的更改
4. 根据需要更新文档

## 许可证

本项目采用 [GPL-3.0 许可证](LICENSE)。

## 致谢

Open Chat Workbench 是在许多开源库和技术的支持下构建的。我们感谢所有这些项目所有贡献者的辛勤工作。

---

感谢您使用 Open Chat Workbench！我们希望它能增强您的 AI 交互体验。