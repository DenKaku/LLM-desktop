/// <reference types="vite/client" />

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

interface Window {
  api: {
    listModels: () => Promise<ModelInfo[]>;
    chat: (payload: ChatRequest) => Promise<ChatResponse>;
    checkThinkingSupport: (model: string) => Promise<boolean>;
  };
}
