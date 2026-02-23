# Open Chat Workbench

English | [中文](README.zh.md)

Open Chat Workbench is a powerful, open-source chat application designed to provide a unified interface for interacting with various AI models from different providers. It offers a seamless user experience with advanced features for managing conversations, workspaces, and customizing AI interactions.

## Key Features

- **Multi-Provider Support**: Integrates with multiple AI providers including OpenAI, Anthropic, Gemini, DeepSeek, and Alibaba Cloud
- **Conversation Management**: Create, organize, and manage conversations with advanced threading capabilities
- **Workspace Organization** (Coming soon): Group related conversations into workspaces for better organization
- **Rich Text Editor**: Enhanced message input with formatting options using Tiptap
- **Markdown Support**: Render Markdown content in messages for better readability
- **File Attachments**: Support for uploading and sharing files in conversations
- **Internationalization**: Built-in support for English and Chinese languages
- **Data Import/Export**: Easily transfer your conversations between instances
- **Customizable Settings**: Fine-tune model parameters, provider configurations, and UI preferences

## Quick Start

### Online deployment

This project is [available online](https://chat.openchatworkbench.com)! What you needed to do is just access the site and configure your provider.

### Development

#### Prerequisites

- Node.js ^20.19.0 || >=22.12.0
- pnpm package manager

#### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/shc0743/OpenChatWorkbench.git
   cd OpenChatWorkbench
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Start the development server
   ```bash
   pnpm dev
   ```

4. Build for production
   ```bash
   pnpm build
   ```

## Supported AI Models

Open Chat Workbench supports APIs using these protocols:

- **OpenAI**: Currently `Chat.Completion` API is fully supported; supports for `Responses` API will be added later
- **Anthropic**: Anthropic API has partial support
- **Gemini**: Gemini API has partial support

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue to report bugs or suggest features.

### Development Guidelines

1. Follow the existing code style and structure
2. Write clear, concise commit messages
3. Test your changes thoroughly
4. Update documentation as needed

## License

This project is licensed under the [GPL-3.0 License](LICENSE).

## Acknowledgements

Open Chat Workbench is built with the support of many open-source libraries and technologies. We appreciate the hard work of all contributors to these projects.

---

Thank you for using Open Chat Workbench! We hope it enhances your AI interaction experience.
