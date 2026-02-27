'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { StreamingText } from './ThinkingDisplay';
import { OverridePreview } from './OverridePreview';
import type { SuggestedOverride } from '@/lib/ai/streaming-projection-agent';

interface ChatInterfaceProps {
  tourId: string;
  scenarioId: string;
  useStreaming?: boolean;
  onOverridesApplied?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  overrides?: SuggestedOverride[];
}

interface StreamEvent {
  type: 'content' | 'override_suggestion' | 'complete' | 'error';
  content?: string;
  overrides?: SuggestedOverride[];
}

export function ChatInterface({
  tourId,
  scenarioId,
  useStreaming = false,
  onOverridesApplied
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingOverrides, setPendingOverrides] = useState<SuggestedOverride[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, pendingOverrides]);

  const handleApplyOverrides = useCallback(async (overrides: SuggestedOverride[]) => {
    setIsApplying(true);

    try {
      const response = await fetch('/api/projections/apply-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          tourId,
          overrides
        })
      });

      const result = await response.json();

      if (result.success) {
        // Add confirmation message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Applied ${result.appliedCount} override${result.appliedCount !== 1 ? 's' : ''} successfully. The projection sheet has been updated.`
        }]);
        setPendingOverrides([]);
        onOverridesApplied?.();
      } else {
        const failedMsg = result.failedCount > 0
          ? ` (${result.failedCount} failed)`
          : '';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Applied ${result.appliedCount} override${result.appliedCount !== 1 ? 's' : ''}${failedMsg}.`
        }]);
        setPendingOverrides([]);
      }
    } catch (error) {
      console.error('Failed to apply overrides:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while applying the changes. Please try again.'
      }]);
    } finally {
      setIsApplying(false);
    }
  }, [scenarioId, tourId, onOverridesApplied]);

  const handleRejectOverrides = useCallback(() => {
    setPendingOverrides([]);
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'No problem, I\'ve cancelled those changes. Let me know if you\'d like to try a different adjustment.'
    }]);
  }, []);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setPendingOverrides([]);

    if (useStreaming) {
      await sendMessageWithStreaming(userMessage);
    } else {
      await sendMessageLegacy(userMessage);
    }
  }

  async function sendMessageWithStreaming(userMessage: string) {
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/projections/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          scenarioId,
          message: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let receivedOverrides: SuggestedOverride[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const event: StreamEvent = JSON.parse(line.replace('data: ', ''));

            switch (event.type) {
              case 'content':
                fullContent += event.content || '';
                setStreamingContent(fullContent);
                break;

              case 'override_suggestion':
                if (event.overrides && event.overrides.length > 0) {
                  receivedOverrides = event.overrides;
                  setPendingOverrides(event.overrides);
                }
                break;

              case 'complete':
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: fullContent,
                  overrides: receivedOverrides.length > 0 ? receivedOverrides : undefined
                }]);
                setStreamingContent('');
                break;

              case 'error':
                throw new Error(event.content || 'Stream error');
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE event:', line);
          }
        }
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      setStreamingContent('');
      setPendingOverrides([]);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }

  async function sendMessageLegacy(userMessage: string) {
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
        {messages.length === 0 && !isStreaming && (
          <div className="text-sm text-[var(--color-text-muted)] text-center py-8">
            Ask me anything about your projections, historical sales, or inventory strategy.
            <div className="mt-4 space-y-2">
              <div className="text-xs">Try asking:</div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                • "What sizes sold best for hoodies?"<br />
                • "Which products have the highest margin?"<br />
                • "Increase hoodie projections by 20%"<br />
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
                ? 'bg-[var(--color-red-primary)]/10 ml-8'
                : 'bg-[var(--color-bg-border)] mr-8'
            }`}
          >
            <div className="text-xs text-[var(--color-text-muted)] mb-1">
              {msg.role === 'user' ? 'You' : 'AI Assistant'}
            </div>
            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingContent && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-border)] mr-8">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">AI Assistant</div>
            <StreamingText
              content={streamingContent}
              isStreaming={true}
              className="text-sm"
            />
          </div>
        )}

        {/* Pending overrides preview */}
        {pendingOverrides.length > 0 && !isStreaming && (
          <div className="mr-8">
            <OverridePreview
              overrides={pendingOverrides}
              onApply={handleApplyOverrides}
              onReject={handleRejectOverrides}
              isApplying={isApplying}
            />
          </div>
        )}

        {/* Legacy loading state */}
        {loading && !isStreaming && !streamingContent && (
          <div className="p-3 rounded-lg bg-[var(--color-bg-border)] mr-8">
            <div className="text-xs text-[var(--color-text-muted)] mb-1">AI Assistant</div>
            <div className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-red-primary)] animate-pulse" />
              Thinking...
            </div>
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
          placeholder="Ask about projections, or request changes like 'Increase hoodies by 20%'..."
          className="flex-1 g-input"
          disabled={loading || isApplying}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim() || isApplying}
          className="px-4 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
