import { contextBridge, ipcRenderer } from 'electron';

type ThinkingMode = 'off' | 'low' | 'medium' | 'high';
type Role = 'user' | 'assistant';

interface ModelInfo {
  name: string;
  supportsThinking: boolean;
}

interface Message {
  role: Role;
  content: string;
}

interface ChatRequest {
  model: string;
  thinkingMode: ThinkingMode;
  messages: Message[];
}

interface ChatResponse {
  content: string;
}

interface ChatStreamChunk {
  type: 'thinking' | 'content';
  delta: string;
}

contextBridge.exposeInMainWorld('api', {
  listModels: (): Promise<ModelInfo[]> => ipcRenderer.invoke('ollama:list-models'),
  chat: (payload: ChatRequest): Promise<ChatResponse> => ipcRenderer.invoke('ollama:chat', payload),
  chatStream: (payload: ChatRequest): Promise<ChatResponse> => ipcRenderer.invoke('ollama:chat-stream', payload),
  onChatChunk: (listener: (chunk: ChatStreamChunk) => void): (() => void) => {
    const wrapped = (_event: unknown, chunk: ChatStreamChunk) => listener(chunk);
    ipcRenderer.on('ollama:chat-chunk', wrapped);
    return () => ipcRenderer.removeListener('ollama:chat-chunk', wrapped);
  },
  checkThinkingSupport: (model: string): Promise<boolean> => ipcRenderer.invoke('ollama:check-thinking-support', model)
});
