export type ThinkingMode = 'off' | 'low' | 'medium' | 'high';

export type Role = 'user' | 'assistant';

export interface Message {
  role: Role;
  content: string;
}

export interface ChatRequest {
  model: string;
  thinkingMode: ThinkingMode;
  messages: Message[];
}

export interface ChatResponse {
  content: string;
  thinking?: string;
}

export interface ChatStreamChunk {
  type: 'thinking' | 'content';
  delta: string;
}
