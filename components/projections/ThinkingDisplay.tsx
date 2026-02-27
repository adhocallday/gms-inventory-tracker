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

  const isDark = variant === 'dark';

  return (
    <div
      className={`rounded-xl overflow-hidden border ${
        isDark
          ? 'bg-slate-900 border-slate-700'
          : 'bg-white border-[var(--color-bg-border)]'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${
          isDark
            ? 'bg-slate-800 border-slate-700'
            : 'bg-[var(--color-bg-muted)] border-[var(--color-bg-border)]'
        }`}
      >
        <div className="flex items-center gap-2">
          {isActive ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-emerald-400' : 'text-[var(--color-red-primary)]'}`} />
          ) : (
            <Brain className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`} />
          )}
          <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-[var(--color-text-primary)]'}`}>
            AI Thinking
          </span>
        </div>

        {/* Progress indicator */}
        {isActive && progress > 0 && (
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-[var(--color-text-muted)]'}`}>
            {progress}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className={`h-1 ${isDark ? 'bg-slate-800' : 'bg-[var(--color-bg-muted)]'}`}>
          <div
            className={`h-full transition-all duration-300 ${
              isDark ? 'bg-emerald-500' : 'bg-[var(--color-red-primary)]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Phase indicator */}
      {phase && (
        <div
          className={`flex items-center gap-2 px-4 py-2 text-xs ${
            isDark
              ? 'bg-slate-800/50 text-emerald-400'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-red-primary)]'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isActive
                ? isDark ? 'bg-emerald-400 animate-pulse' : 'bg-[var(--color-red-primary)] animate-pulse'
                : isDark ? 'bg-slate-500' : 'bg-[var(--color-text-muted)]'
            }`}
          />
          {phase}
        </div>
      )}

      {/* Content area */}
      <div
        ref={contentRef}
        className={`p-4 font-mono text-sm max-h-64 overflow-y-auto ${
          isDark ? 'text-slate-300' : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {content ? (
          <div className="whitespace-pre-wrap leading-relaxed">
            {content}
            {isActive && (
              <span
                className={`inline-block w-2 h-4 ml-0.5 animate-pulse ${
                  isDark ? 'bg-emerald-400' : 'bg-[var(--color-red-primary)]'
                }`}
              />
            )}
          </div>
        ) : (
          <div className={`text-center py-4 ${isDark ? 'text-slate-500' : 'text-[var(--color-text-muted)]'}`}>
            {isActive ? 'Waiting for AI response...' : 'Click Generate to start AI analysis'}
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
