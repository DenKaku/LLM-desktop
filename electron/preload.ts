import { contextBridge, ipcRenderer } from 'electron';
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../types/chat';
import type { ModelInfo } from '../types/model';

const logPreload = (...args: unknown[]) => console.log('[preload]', ...args);
logPreload('bridge initialized');

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
