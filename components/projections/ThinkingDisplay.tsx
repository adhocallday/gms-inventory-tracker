'use client';

import { useEffect, useRef } from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface ThinkingDisplayProps {
  content: string;
  phase: string;
  progress: number;
  isActive: boolean;
  variant?: 'dark' | 'light';
}

/**
 * ThinkingDisplay - Shows AI reasoning process in real-time
 *
 * Displays streaming AI thoughts in a terminal-like panel with:
 * - Phase indicator showing current step
 * - Progress bar
 * - Streaming text content
 * - Auto-scroll to latest content
 */
export function ThinkingDisplay({
  content,
  phase,
  progress,
  isActive,
  variant = 'dark'
}: ThinkingDisplayProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content]);

  // Both variants render on the app's surfaces; the dark terminal look was
  // a leftover from the dark theme. `variant` is kept for callers.
  void variant;

  return (
    <div className="rounded-lg overflow-hidden border bg-[var(--color-bg-surface)] border-[var(--color-bg-border)]">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-[var(--color-bg-elevated)] border-[var(--color-bg-border)]">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className="w-4 h-4 animate-spin text-ai" aria-hidden="true" />
          ) : (
            <Brain className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          )}
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Claude&apos;s reasoning</span>
        </div>
        {isActive && progress > 0 && (
          <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">{progress}%</span>
        )}
      </div>

      {isActive && (
        <div className="h-1 bg-[var(--color-bg-elevated)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full transition-all duration-300 bg-ai" style={{ width: `${progress}%` }} />
        </div>
      )}

      {phase && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs bg-ai-bg text-ai" role="status">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-ai animate-pulse' : 'bg-[var(--color-text-muted)]'}`} />
          {phase}
        </div>
      )}

      <div ref={contentRef} className="p-4 text-sm max-h-64 overflow-y-auto text-[var(--color-text-secondary)]">
        {content ? (
          <div className="whitespace-pre-wrap leading-relaxed">
            {content}
            {isActive && <span className="inline-block w-2 h-4 ml-0.5 animate-pulse bg-ai" aria-hidden="true" />}
          </div>
        ) : (
          <div className="text-center py-4">
            {isActive ? 'Waiting for Claude…' : 'Nothing yet. Generate projections to see the reasoning here.'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StreamingText - Simple streaming text display with cursor
 */
export function StreamingText({
  content,
  isStreaming,
  className = ''
}: {
  content: string;
  isStreaming: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [content]);

  return (
    <div ref={ref} className={`whitespace-pre-wrap ${className}`}>
      {content}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse" />
      )}
    </div>
  );
}
