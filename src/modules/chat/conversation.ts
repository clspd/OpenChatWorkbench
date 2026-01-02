import { fs } from '@/userdata';
import { SchemaVersion } from '@/types/index.ts';
import type { Conversation } from '@/types/index.ts';

// 对话文件存储路径
const CONVERSATIONS_DIR = '/data/conversations/';

// 确保对话目录存在
async function ensureConversationsDirExists() {
  try {
    await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create conversations directory:', error);
    throw error;
  }
}

// 生成UUID
function generateUUID(): string {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 创建新对话
export async function createNewConversation(): Promise<Conversation> {
  await ensureConversationsDirExists();
  
  const now = Date.now();
  const conversation: Conversation = {
    schemaVersion: SchemaVersion.V1,
    id: generateUUID(),
    session: {
      created_at: now,
      updated_at: now,
      title: 'New Conversation',
      title_type: 'SYSTEM'
    },
    messages: []
  };
  
  return conversation;
}

// 保存对话
export async function saveConversation(conversation: Conversation): Promise<void> {
  await ensureConversationsDirExists();
  
  // 更新会话更新时间
  conversation.session.updated_at = Date.now();
  
  const filePath = `${CONVERSATIONS_DIR}${conversation.id}.json`;
  try {
    await fs.writeFile(filePath, JSON.stringify(conversation), 'utf-8');
  } catch (error) {
    console.error(`Failed to save conversation ${conversation.id}:`, error);
    throw error;
  }
}

// 加载对话
export async function loadConversation(conversationId: string): Promise<Conversation> {
  const filePath = `${CONVERSATIONS_DIR}${conversationId}.json`;
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Conversation;
  } catch (error) {
    console.error(`Failed to load conversation ${conversationId}:`, error);
    throw error;
  }
}

// 获取对话列表
export async function getConversationList(): Promise<Conversation[]> {
  await ensureConversationsDirExists();
  
  try {
    const files = await fs.readdir(CONVERSATIONS_DIR, { withFileTypes: true });
    const conversationFiles = files.filter(file => file.isFile() && file.name.endsWith('.json'));
    
    const conversations: Conversation[] = [];
    for (const file of conversationFiles) {
      const filePath = `${CONVERSATIONS_DIR}${file.name}`;
      const content = await fs.readFile(filePath, 'utf-8');
      const conversation = JSON.parse(content) as Conversation;
      conversations.push(conversation);
    }
    
    // 按更新时间降序排序
    conversations.sort((a, b) => b.session.updated_at - a.session.updated_at);
    
    return conversations;
  } catch (error) {
    console.error('Failed to get conversation list:', error);
    return [];
  }
}

// 删除对话
export async function deleteConversation(conversationId: string): Promise<void> {
  const filePath = `${CONVERSATIONS_DIR}${conversationId}.json`;
  
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete conversation ${conversationId}:`, error);
    throw error;
  }
}

// 更新对话标题
export async function updateConversationTitle(conversationId: string, title: string, titleType: 'USER' | 'SYSTEM'): Promise<void> {
  try {
    const conversation = await loadConversation(conversationId);
    conversation.session.title = title;
    conversation.session.title_type = titleType;
    conversation.session.updated_at = Date.now();
    await saveConversation(conversation);
  } catch (error) {
    console.error(`Failed to update conversation title ${conversationId}:`, error);
    throw error;
  }
}
