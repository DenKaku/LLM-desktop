/// <reference types="vite/client" />
import type { ChatRequest, ChatResponse, ChatStreamChunk } from '../types/chat';
import type { ModelInfo } from '../types/model';

declare global {
  interface Window {
    api: {
      listModels: () => Promise<ModelInfo[]>;
      chat: (payload: ChatRequest) => Promise<ChatResponse>;
      chatStream: (payload: ChatRequest) => Promise<ChatResponse>;
      onChatChunk: (listener: (chunk: ChatStreamChunk) => void) => () => void;
      checkThinkingSupport: (model: string) => Promise<boolean>;
    };
  }
}

export {};
