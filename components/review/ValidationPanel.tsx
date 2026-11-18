'use client';

import { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface ValidationPanelProps {
  validation?: {
    missing_fields?: string[];
    warnings?: string[];
  };
}

/** Field keys from the validator (tour_id, show_date) as words a reviewer recognises. */
const FIELD_LABELS: Record<string, string> = { tour_id: 'Tour', show_id: 'Show' };
function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  if (!/^[a-z0-9_]+$/.test(field)) return field;
  const words = field.replace(/_id$/, '').split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function ValidationPanel({ validation }: ValidationPanelProps) {
  const [expandedErrors, setExpandedErrors] = useState(true);
  const [expandedWarnings, setExpandedWarnings] = useState(true);

  const missingFields = validation?.missing_fields || [];
  const warnings = validation?.warnings || [];

  if (missingFields.length === 0 && warnings.length === 0) {
    return (
      <div className="rounded-lg border p-4 mb-6 bg-success-bg border-success-border" role="status">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <span className="text-sm text-success font-semibold">
            All required fields are filled and nothing needs checking
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Missing Fields (Blocking Errors) */}
      {missingFields.length > 0 && (
        <div className="rounded-lg border p-4 bg-danger-bg border-danger-border">
          <button
            type="button"
            aria-expanded={expandedErrors}
            className="w-full flex items-center justify-between text-left"
            onClick={() => setExpandedErrors(!expandedErrors)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <span className="text-sm font-semibold text-danger">
                {missingFields.length} required {missingFields.length === 1 ? 'field' : 'fields'} missing
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {expandedErrors ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
            </span>
          </button>

          {expandedErrors && (
            <ul className="mt-3 space-y-1 text-sm list-disc list-inside text-[var(--color-text-secondary)]">
              {missingFields.map((field, index) => (
                <li key={index}>{fieldLabel(field)}</li>
              ))}
            </ul>
          )}

          {expandedErrors && (
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              Fill these before posting.
            </p>
          )}
        </div>
      )}

      {/* Warnings (Non-Blocking) */}
      {warnings.length > 0 && (
        <div className="rounded-lg border p-4 bg-warn-bg border-warn-border">
          <button
            type="button"
            aria-expanded={expandedWarnings}
            className="w-full flex items-center justify-between text-left"
            onClick={() => setExpandedWarnings(!expandedWarnings)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warn" aria-hidden="true" />
              <span className="text-sm font-semibold text-warn">
                {warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-secondary)]">
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
            <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
              Warnings do not block posting. Check each one against the PDF.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
