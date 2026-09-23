'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { chatApi, type ChatMessage } from '../lib/api';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Xin chào! Tôi là trợ lý ảo của Restaurant Hub. Bạn muốn hỏi về thực đơn, tình trạng bàn, đặt bàn hay lớp học nấu ăn?',
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, busy]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError('');
    const nextMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    try {
      const history = nextMessages.slice(-8);
      const result = await chatApi.send(text, history);
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể gửi tin nhắn, vui lòng thử lại.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>Trợ lý nhà hàng</span>
            <button
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng trợ lý ảo"
            >
              ×
            </button>
          </div>
          <div className="chat-panel-messages" ref={listRef}>
            {messages.map((message, index) => (
              <div key={index} className={`chat-bubble chat-bubble-${message.role}`}>
                {message.content}
              </div>
            ))}
            {busy && (
              <div className="chat-bubble chat-bubble-assistant chat-typing">Đang trả lời…</div>
            )}
          </div>
          {error && <p className="chat-error">{error}</p>}
          <form className="chat-panel-input" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập câu hỏi…"
              maxLength={500}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
      <button
        className="chat-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Đóng trợ lý ảo' : 'Mở trợ lý ảo'}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
