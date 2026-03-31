import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

type ThinkingMode = 'off' | 'low' | 'medium' | 'high';
type Role = 'user' | 'assistant';

interface ChatMessage {
  role: Role;
  content: string;
}

interface ChatPayload {
  model: string;
  thinkingMode: ThinkingMode;
  messages: ChatMessage[];
}

interface ModelInfo {
  name: string;
  supportsThinking: boolean;
}

const THINKING_MODEL_KEYWORDS = ['deepseek-r1', 'qwen3', 'qwq', 'reason', 'thinking'];

function inferThinkingSupport(modelName: string): boolean {
  const lower = modelName.toLowerCase();
  return THINKING_MODEL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

async function ollamaFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  const url = `${OLLAMA_BASE_URL}${pathname}`;
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`无法连接到 Ollama（${OLLAMA_BASE_URL}）。请确认服务已启动。`);
  }

  if (!response.ok) {
    let errorMessage = `Ollama 请求失败（${response.status}）`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // Ignore parsing failures and keep default message.
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

async function listModels(): Promise<ModelInfo[]> {
  const data = await ollamaFetch<{ models?: Array<{ name: string }> }>('/api/tags');
  const models = data.models ?? [];
  return models.map((model) => ({
    name: model.name,
    supportsThinking: inferThinkingSupport(model.name)
  }));
}

async function chat(payload: ChatPayload): Promise<{ content: string }> {
  const supportsThinking = inferThinkingSupport(payload.model);
  const thinkingMode = supportsThinking ? payload.thinkingMode : 'off';
  const think = thinkingMode !== 'off';

  const body = {
    model: payload.model,
    messages: payload.messages,
    stream: false,
    think
  };

  const result = await ollamaFetch<{ message?: { content?: string } }>('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const content = result.message?.content?.trim();
  if (!content) {
    throw new Error('模型返回内容为空，请重试。');
  }

  return { content };
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('ollama:list-models', async () => listModels());
  ipcMain.handle('ollama:check-thinking-support', async (_event, model: string) => inferThinkingSupport(model));
  ipcMain.handle('ollama:chat', async (_event, payload: ChatPayload) => chat(payload));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
