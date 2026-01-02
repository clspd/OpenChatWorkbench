import { fs } from '@/userdata';
import { SchemaVersion } from '@/types/index.ts';
import type { ConversationIndex, ConversationIndexItem, Conversation, ConversationUserPref } from '@/types/index.ts';

const INDEX_DIR = '/data/index/';
const INDEX_FILE = `${INDEX_DIR}0.json`;
const USER_PREF_DIR = '/data/conv_pref/';

async function ensureIndexDirExists() {
  try {
    await fs.mkdir(INDEX_DIR, { recursive: true });
    await fs.mkdir(USER_PREF_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create index directories:', error);
    throw error;
  }
}

async function loadIndex(): Promise<ConversationIndex> {
  await ensureIndexDirExists();
  
  try {
    const content = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(content) as ConversationIndex;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return {
        schemaVersion: SchemaVersion.V1,
        conversations: [],
        has_more: false
      };
    }
    console.error('Failed to load index:', error);
    throw error;
  }
}

async function saveIndex(index: ConversationIndex): Promise<void> {
  await ensureIndexDirExists();
  
  try {
    await fs.writeFile(INDEX_FILE, JSON.stringify(index), 'utf-8');
  } catch (error) {
    console.error('Failed to save index:', error);
    throw error;
  }
}

export async function addToIndex(conversation: Conversation, pinned: boolean = false): Promise<void> {
  const index = await loadIndex();
  
  const item: ConversationIndexItem = {
    id: conversation.id,
    created_at: conversation.session.created_at,
    updated_at: conversation.session.updated_at,
    title: conversation.session.title,
    pinned: pinned
  };
  
  const existingIndex = index.conversations.findIndex(c => c.id === conversation.id);
  if (existingIndex !== -1) {
    index.conversations[existingIndex] = item;
  } else {
    index.conversations.push(item);
  }
  
  await saveIndex(index);
}

export async function updateInIndex(conversation: Conversation, pinned?: boolean): Promise<void> {
  const index = await loadIndex();
  
  const existingIndex = index.conversations.findIndex(c => c.id === conversation.id);
  const item = index.conversations[existingIndex];
  if (existingIndex !== -1 && item) {
    item.updated_at = conversation.session.updated_at;
    item.title = conversation.session.title;
    if (pinned !== undefined) {
      item.pinned = pinned;
    }
    await saveIndex(index);
  }
}

export async function removeFromIndex(conversationId: string): Promise<void> {
  const index = await loadIndex();
  
  index.conversations = index.conversations.filter(c => c.id !== conversationId);
  
  await saveIndex(index);
}

export async function getIndex(): Promise<ConversationIndex> {
  return await loadIndex();
}

export async function updatePinnedStatus(conversationId: string, pinned: boolean): Promise<void> {
  const index = await loadIndex();
  
  const existingIndex = index.conversations.findIndex(c => c.id === conversationId);
  const item = index.conversations[existingIndex];
  if (existingIndex !== -1 && item) {
    item.pinned = pinned;
    await saveIndex(index);
  }
}

export async function loadUserPref(conversationId: string): Promise<ConversationUserPref | null> {
  await ensureIndexDirExists();
  
  const filePath = `${USER_PREF_DIR}${conversationId}.json`;
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ConversationUserPref;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return null;
    }
    console.error('Failed to load user pref:', error);
    throw error;
  }
}

export async function saveUserPref(userPref: ConversationUserPref): Promise<void> {
  await ensureIndexDirExists();
  
  const filePath = `${USER_PREF_DIR}${userPref.id}.json`;
  
  try {
    await fs.writeFile(filePath, JSON.stringify(userPref), 'utf-8');
  } catch (error) {
    console.error('Failed to save user pref:', error);
    throw error;
  }
}

export async function updateUserPref(conversationId: string, currentMessageId: number, pinned: boolean): Promise<void> {
  let userPref = await loadUserPref(conversationId);
  
  if (!userPref) {
    userPref = {
      schemaVersion: SchemaVersion.V1,
      id: conversationId,
      current_message_id: currentMessageId,
      pinned: pinned,
      last_access_at: Date.now()
    };
  } else {
    userPref.current_message_id = currentMessageId;
    userPref.pinned = pinned;
    userPref.last_access_at = Date.now();
  }
  
  await saveUserPref(userPref);
}
