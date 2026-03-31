import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const THINKING_OPTIONS: Array<{ label: string; value: ThinkingMode }> = [
  { label: '关闭', value: 'off' },
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' }
];

const THINKING_HINT: Record<Exclude<ThinkingMode, 'off'>, string> = {
  low: '思考中（轻度）',
  medium: '思考中（标准）',
  high: '思考中（深度）'
};

const THINKING_LABEL_MAP: Record<ThinkingMode, string> = {
  off: '关闭',
  low: '低',
  medium: '中',
  high: '高'
};

interface ViewMessage {
  role: Message['role'] | 'system' | 'thinking';
  content: string;
}

export function App() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>('off');
  const [messages, setMessages] = useState<ViewMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [streamThinking, setStreamThinking] = useState('');
  const [streamContent, setStreamContent] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastModelRef = useRef('');
  const lastThinkingModeRef = useRef<ThinkingMode>('off');
  const streamThinkingRef = useRef('');
  const streamContentRef = useRef('');

  useEffect(() => {
    const unsubscribe = window.api.onChatChunk((chunk) => {
      if (chunk.type === 'thinking') {
        streamThinkingRef.current += chunk.delta;
        setStreamThinking(streamThinkingRef.current);
        return;
      }
      streamContentRef.current += chunk.delta;
      setStreamContent(streamContentRef.current);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setError('');
        const list = await window.api.listModels();
        setModels(list);
        if (list.length > 0) {
          setSelectedModel(list[0].name);
          lastModelRef.current = list[0].name;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '模型列表加载失败');
      }
    };

    void loadModels();
  }, []);

  const currentModel = useMemo(() => models.find((m) => m.name === selectedModel), [models, selectedModel]);
  const supportsThinking = currentModel?.supportsThinking ?? false;

  useEffect(() => {
    if (!supportsThinking) {
      setThinkingMode('off');
    }
  }, [supportsThinking]);

  useEffect(() => {
    if (!selectedModel) return;
    if (selectedModel === lastModelRef.current) return;

    setMessages((prev) => [...prev, { role: 'system', content: `已切换模型：${selectedModel}` }]);
    lastModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    if (thinkingMode === lastThinkingModeRef.current) return;

    setMessages((prev) => [
      ...prev,
      { role: 'system', content: `已切换思考模式：${THINKING_LABEL_MAP[thinkingMode]}` }
    ]);
    lastThinkingModeRef.current = thinkingMode;
  }, [thinkingMode]);

  const scrollToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadingText = thinkingMode === 'off' || !supportsThinking ? '生成中...' : THINKING_HINT[thinkingMode];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || !selectedModel || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const nextChatHistory = [...chatHistory, userMessage];

    setMessages((prev) => [...prev, userMessage]);
    setChatHistory(nextChatHistory);
    streamThinkingRef.current = '';
    streamContentRef.current = '';
    setStreamThinking('');
    setStreamContent('');
    setInput('');
    setLoading(true);
    setError('');

    try {
      const response = await window.api.chatStream({
        model: selectedModel,
        thinkingMode: supportsThinking ? thinkingMode : 'off',
        messages: nextChatHistory
      });

      const finalThinking = streamThinkingRef.current.trim() || response.thinking?.trim() || '';
      if (finalThinking) {
        setMessages((prev) => [...prev, { role: 'thinking', content: finalThinking }]);
      }

      const finalContent = streamContentRef.current.trim() || response.content;
      const assistantMessage: Message = { role: 'assistant', content: finalContent };
      setMessages((prev) => [...prev, assistantMessage]);
      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败，请重试。');
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        const inputEl = inputRef.current;
        if (!inputEl) return;
        inputEl.focus();
        inputEl.select();
      }, 0);
      streamThinkingRef.current = '';
      streamContentRef.current = '';
      setStreamThinking('');
      setStreamContent('');
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Local LLM Chat</div>
        <div className="subtitle">Ollama Desktop</div>
      </aside>

      <main className="main">
        <header className="toolbar">
          <label>
            模型
            <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            思考模式
            <select
              value={thinkingMode}
              onChange={(e) => setThinkingMode(e.target.value as ThinkingMode)}
              disabled={!supportsThinking}
            >
              {THINKING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {!supportsThinking && <div className="hint">当前模型不支持思考模式，已自动关闭</div>}
        </header>
        <div className="status-bar">
          当前模型：<strong>{selectedModel || '未选择'}</strong>
          <span className="status-gap">|</span>
          思考模式：<strong>{THINKING_LABEL_MAP[supportsThinking ? thinkingMode : 'off']}</strong>
        </div>

        <section ref={messagesRef} className="messages">
          {messages.length === 0 && <div className="empty">你好，开始和本地模型聊天吧。</div>}
          {messages.map((msg, idx) => (
            <div key={`${msg.role}-${idx}`} className={`msg-row ${msg.role}`}>
              <div className="bubble">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <>
              {supportsThinking && thinkingMode !== 'off' && (
                <div className="msg-row thinking">
                  <div className="bubble thinking-stream">{streamThinking || loadingText}</div>
                </div>
              )}
              <div className="msg-row assistant">
                <div className="bubble loading">{streamContent || '生成中...'}</div>
              </div>
            </>
          )}
        </section>

        <form className="input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedModel ? '输入内容，按 Enter 发送' : '等待加载模型列表...'}
            disabled={!selectedModel || loading}
          />
          <button type="submit" disabled={!selectedModel || loading || !input.trim()}>
            发送
          </button>
        </form>

        {error && <div className="error">{error}</div>}
      </main>
    </div>
  );
}
