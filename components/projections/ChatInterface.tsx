'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatInterfaceProps {
  tourId: string;
  scenarioId: string;
}

export function ChatInterface({ tourId, scenarioId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/projections/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          scenarioId,
          message: userMessage
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 && (
          <div className="text-sm text-[var(--g-text-muted)] text-center py-8">
            Ask me anything about your projections, historical sales, or inventory strategy.
            <div className="mt-4 space-y-2">
              <div className="text-xs">Try asking:</div>
              <div className="text-xs text-[var(--g-text-dim)]">
                • "What sizes sold best for hoodies?"<br />
                • "Which products have the highest margin?"<br />
                • "Am I at risk of stocking out on any items?"
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-[var(--g-accent)]/10 ml-8'
                : 'bg-white/5 mr-8'
            }`}
          >
            <div className="text-xs text-[var(--g-text-muted)] mb-1">
              {msg.role === 'user' ? 'You' : 'AI Assistant'}
            </div>
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="p-3 rounded-lg bg-white/5 mr-8">
            <div className="text-xs text-[var(--g-text-muted)] mb-1">AI Assistant</div>
            <div className="text-sm">Thinking...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about projections, sales, or inventory..."
          className="flex-1 g-input"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
