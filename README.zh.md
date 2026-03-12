# Open Chat Workbench

[English](README.md) | 中文

Open Chat Workbench 是一个功能强大、开源的聊天应用程序，旨在为与来自不同提供商的各种 AI 模型交互提供一个统一的界面。它提供了无缝的用户体验，并具备管理对话、工作空间和自定义 AI 交互的高级功能。我们的目标是使 AI 聊天更加简单，提供一个最大化用户体验的 AI 聊天平台。

[开始使用](https://chat.openchatworkbench.com)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/clspd/OpenChatWorkbench)

## 主要特性

- **对话管理**：创建、组织和管理对话，具备高级线程功能
- **多分支对话**：自由分叉和修改您的对话
- **工作空间组织**（即将推出）：将相关对话分组到工作空间，以便更好地组织
- **富文本编辑器**：使用 Tiptap 增强的消息输入，支持格式化选项
- **Markdown 支持**：在消息中渲染 Markdown 内容，提高可读性
- **文件附件**：支持在对话中上传和共享文件
- **国际化**：内置支持英语和中文
- **数据导入/导出**：轻松在不同实例之间传输您的对话
- **可自定义设置**：微调模型参数、提供商配置和 UI 偏好

## 即将推出的特性

- [ ] 可视化的对话分支查看器，允许用户直观地在对话分支中跳转和导航。
- [ ] 使用 `Pyodide` 和 `WebContainers` 技术实现客户端 Shell 访问，允许 Agent 在受控环境中执行 shell 命令而无需安装任何软件。
- [ ] 通过 File system Access API 实现客户端 Shell 操作中与本地文件系统的双向同步，
  允许 Agent 在用户授权后直接读写本地文件系统中的文件。
- [ ] 接入 MCP (Model Context Protocol) 协议，实现与不同 AI 模型的无缝交互。
- [ ] 创建本地桥接层，允许 Agent 在本地 Shell 环境中执行代码。
- [ ] 允许将聊天记录和配置文件通过 S3 Compatible 存储在用户的对象存储中，实现跨设备同步和备份。
- [ ] 从其他 AI 服务导出的数据中导入对话。
- [ ] 建立对话内容索引，允许用户对对话进行快速的全局搜索。

## 快速开始

### 在线部署

本项目[可在线访问](https://chat.openchatworkbench.com)！您只需访问该网站并配置您的提供商即可开始使用。

注意，我们还为某些网络条件（如中国大陆部分地区）提供了备份站点（使用 Cloudflare ，避免了 Vercel 偶发性无法访问的情况），地址为 [chat2.openchatworkbench.com](https://chat2.openchatworkbench.com)。如果您无法访问主站点，您可以尝试备份站点。

### 开发

#### 先决条件

- Node.js ^20.19.0 || >=22.12.0
- pnpm 包管理器

#### 安装

*重要提示*：如果您想将项目部署到自己的站点，目前需要[修改 src/config.ts](src/config.ts) 以将这些硬编码的域名更改为您自己的。这将在后续改进，例如使用 `.env` 文件。

1. 克隆仓库
   ```bash
   git clone https://github.com/clspd/OpenChatWorkbench.git
   cd OpenChatWorkbench
   ```

2. 安装依赖
   ```bash
   pnpm install
   ```

3. 运行 `pnpm generate-dyndata` 以生成项目运行所需的动态数据 （虽然只是个占位符而已😂但代码中对这些动态数据有依赖）
   ```bash
   pnpm generate-dyndata
   ```

4. 启动开发服务器
   ```bash
   pnpm dev
   ```

5. 编辑 `src/config.ts` 文件

6. 构建生产版本
   ```bash
   pnpm build
   ```

## 支持的 AI 模型

Open Chat Workbench 支持使用以下协议的 API：

- **OpenAI**：目前完全支持 `Chat.Completion` API；对 `Responses` API 的支持将在后续添加
- **Anthropic**：Anthropic API 已获得部分支持
- **Gemini**：Gemini API 已获得部分支持

## 贡献

欢迎贡献！请随时提交 Pull Request 或打开 Issue 来报告错误或建议功能。

### 开发指南

1. 遵循现有的代码风格和结构
2. 编写清晰、简洁的提交信息
3. 彻底测试您的更改
4. 根据需要更新文档

## 许可证

本项目根据 [GPL-3.0 许可证](LICENSE) 授权。

## 致谢

Open Chat Workbench 是在许多开源库和技术的支持下构建的。我们感谢所有为这些项目做出贡献的辛勤工作。

---

感谢您使用 Open Chat Workbench！我们希望它能提升您的 AI 交互体验。
