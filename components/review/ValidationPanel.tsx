'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Zap } from 'lucide-react';

interface ValidationPanelProps {
  validation?: {
    missing_fields?: string[];
    warnings?: string[];
  };
}

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  const [expandedErrors, setExpandedErrors] = useState(true);
  const [expandedWarnings, setExpandedWarnings] = useState(true);

  const missingFields = validation?.missing_fields || [];
  const warnings = validation?.warnings || [];

  if (missingFields.length === 0 && warnings.length === 0) {
    return (
      <div className="g-card p-4 mb-6 border-green-500/30">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 shrink-0 text-green-400" aria-hidden="true" />
          <span className="text-sm text-green-300 font-semibold">
            No validation issues found
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Missing Fields (Blocking Errors) */}
      {missingFields.length > 0 && (
        <div className="g-card p-4 border-[var(--color-red-primary)]">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setExpandedErrors(!expandedErrors)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-red-primary)]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[var(--color-red-primary)]">
                {missingFields.length} Required{' '}
                {missingFields.length === 1 ? 'Field' : 'Fields'} Missing
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {expandedErrors ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </span>
          </button>

          {expandedErrors && (
            <ul className="mt-3 space-y-1 text-sm list-disc list-inside text-[var(--color-text-secondary)]">
              {missingFields.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>
          )}

          {expandedErrors && (
            <p className="mt-3 text-xs text-[var(--color-text-muted)] border-t border-white/10 pt-3">
              These fields must be filled before the document can be posted to
              the database.
            </p>
          )}
        </div>
      )}

      {/* Warnings (Non-Blocking) */}
      {warnings.length > 0 && (
        <div className="g-card p-4 border-yellow-500/30">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setExpandedWarnings(!expandedWarnings)}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 shrink-0 text-yellow-400" aria-hidden="true" />
              <span className="text-sm font-semibold text-yellow-300">
                {warnings.length}{' '}
                {warnings.length === 1 ? 'Warning' : 'Warnings'}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {expandedWarnings ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </span>
          </button>

          {expandedWarnings && (
            <ul className="mt-3 space-y-1 text-sm list-disc list-inside text-[var(--color-text-secondary)]">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          )}

          {expandedWarnings && (
            <p className="mt-3 text-xs text-[var(--color-text-muted)] border-t border-white/10 pt-3">
              These warnings won't prevent posting, but you should review them
              carefully.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
