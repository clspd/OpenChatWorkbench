# Open Chat Workbench

English | [中文](README.zh.md)

Open Chat Workbench is a powerful, open-source chat application designed to provide a unified interface for interacting with various AI models from different providers. It offers a seamless user experience with advanced features for managing conversations, workspaces, and customizing AI interactions. Our goal is to make AI chat easier and build the most user-friendly platform for AI chat.

[Try now](https://chat.openchatworkbench.com)

## Key Features

- **Conversation Management**: Create, organize, and manage conversations with advanced threading capabilities
- **Multi-Branching Conversation**: Freely fork and modify your conversation
- **Workspace Organization** (Coming soon): Group related conversations into workspaces for better organization
- **Rich Text Editor**: Enhanced message input with formatting options using Tiptap
- **Markdown Support**: Render Markdown content in messages for better readability
- **File Attachments**: Support for uploading and sharing files in conversations
- **Internationalization**: Built-in support for English and Chinese languages
- **Data Import/Export**: Easily transfer your conversations between instances
- **Customizable Settings**: Fine-tune model parameters, provider configurations, and UI preferences

## Upcoming Features

- [ ] Visualization of conversation branches, allowing users to jump and navigate between different conversation threads intuitively.
- [ ] Client-side Shell access using `Pyodide` and `WebContainers` technology, allowing Agents to execute shell commands in a controlled environment without installing any software.
- [ ] Bidirectional synchronization between the client-side Shell environment and the local file system using the File system Access API, allowing Agents to read and write files on the user's local machine.
- [ ] Integration with the MCP (Model Context Protocol) to enable seamless interaction with different AI models.
- [ ] Creation of a local bridge layer to allow Agents to execute code in the local Shell environment.
- [ ] Allow users to store chat records and configuration files in their object storage using S3 Compatible API,
  enabling cross-device synchronization and backup.
- [ ] Import conversations from other AI services' exported data.
- [ ] Build conversation content index, allowing users to quickly search for conversations globally.

## Quick Start

### Online deployment

This project is [available online](https://chat.openchatworkbench.com)! What you needed to do is just access the site and configure your provider.

Note that we also have a backup site for some network conditions(using cloudflare), which is on [chat2.openchatworkbench.com](https://chat2.openchatworkbench.com). If you cannot access the main site, you can try the backup site.

### Development

#### Prerequisites

- Node.js ^20.19.0 || >=22.12.0
- pnpm package manager

#### Installation

*Important*: If you wants to deploy the project to your own site, it is currently required to [modify src/config.ts](src/config.ts) to change these hardcoded domain to your own. This will be improved later, e.g. using a `.env` file.

1. Clone the repository
   ```bash
   git clone https://github.com/clspd/OpenChatWorkbench.git
   cd OpenChatWorkbench
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Generate dynamic data by running the following command:
   ```bash
   pnpm generate-dyndata
   ```
   (Note: This step is required to generate the dynamic data required for the project to run(although just a placeholder data😂))

4. Start the development server
   ```bash
   pnpm dev
   ```

5. edit the `src/config.ts` file

6. Build for production
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
