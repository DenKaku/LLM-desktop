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

contextBridge.exposeInMainWorld('api', {
  listModels: (): Promise<ModelInfo[]> => ipcRenderer.invoke('ollama:list-models'),
  chat: (payload: ChatRequest): Promise<ChatResponse> => ipcRenderer.invoke('ollama:chat', payload),
  checkThinkingSupport: (model: string): Promise<boolean> => ipcRenderer.invoke('ollama:check-thinking-support', model)
});
