'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ScheduleChatAssistant from './ScheduleChatAssistant';
import { readJsonResponse } from '@/lib/http/read-json';
import { ArrowLeft, ArrowRight, UploadCloud } from 'lucide-react';

interface TourData {
  name: string;
  artist: string;
  startDate: string;
  endDate: string;
}

interface Show {
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface TourScheduleStepProps {
  tourData: TourData;
  shows: Show[];
  onUpdate: (shows: Show[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function TourScheduleStep({ tourData, shows, onUpdate, onNext, onPrev }: TourScheduleStepProps) {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'chat' | 'upload'>('chat');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tourName', tourData.name);
      formData.append('artist', tourData.artist);

      const response = await fetch('/api/admin/parse-schedule', {
        method: 'POST',
        body: formData
      });
      const result = await readJsonResponse(response);
      onUpdate([...shows, ...result.shows]);
    } catch (err: any) {
      setError(err.message);
      console.error('Schedule parse error:', err);
    } finally {
      setParsing(false);
    }
  }, [tourData, shows, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const addManualShow = () => {
    const newShow: Show = {
      showDate: '',
      venueName: '',
      city: '',
      state: '',
      country: 'USA'
    };
    onUpdate([...shows, newShow]);
  };

  const updateShow = (index: number, field: keyof Show, value: string | number) => {
    const updated = [...shows];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate(updated);
  };

  const removeShow = (index: number) => {
    onUpdate(shows.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shows.length === 0) {
      alert('Please add at least one show');
      return;
    }
    // Validate all shows have required fields
    const invalid = shows.some(s => !s.showDate || !s.venueName || !s.city);
    if (invalid) {
      alert('All shows must have date, venue, and city');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Tour schedule & shows</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Paste tour dates as text, upload a PDF/CSV, or add shows manually. AI will extract show dates, venues, and cities.
        </p>
      </div>

      {/* AI Input Mode Toggle */}
      <div className="flex gap-2 p-1 bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setInputMode('chat')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            inputMode === 'chat'
              ? 'bg-[var(--color-red-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
            inputMode === 'upload'
              ? 'bg-[var(--color-red-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          Upload file
        </button>
      </div>

      {/* AI Chat Assistant */}
      {inputMode === 'chat' && (
        <ScheduleChatAssistant
          tourName={tourData.name}
          artist={tourData.artist}
          onShowsExtracted={(extractedShows) => {
            onUpdate([...shows, ...extractedShows]);
          }}
        />
      )}

      {/* AI File Upload */}
      {inputMode === 'upload' && (
        <div className="p-6 border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-elevated)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
            AI-Assisted File upload
          </h3>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
              ${isDragActive ? 'border-[var(--color-red-primary)] bg-[rgba(225,6,20,0.08)]' : 'border-[var(--color-bg-border)] hover:border-[var(--color-text-muted)]'}
              ${parsing ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            {parsing ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
                <p className="text-sm text-[var(--color-text-secondary)]">Parsing schedule with AI...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="mx-auto h-10 w-10 text-[var(--color-text-secondary)]" aria-hidden="true" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {isDragActive ? 'Drop the file here' : 'Drag & drop tour schedule PDF/CSV, or click to select'}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Supports PDF, CSV, XLS, XLSX
                </p>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-3 p-3 bg-danger-bg border border-danger-border rounded-lg">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Shows Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Shows ({shows.length})
          </h3>
          <button
            type="button"
            onClick={addManualShow}
            className="px-3 py-1.5 text-xs bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-primary)] rounded-lg transition font-medium"
          >
            + Add Show Manually
          </button>
        </div>

        {shows.length > 0 ? (
          <div className="border border-[var(--color-bg-border)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-bg-surface)]/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Venue</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">State</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)]">Capacity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bg-border)]">
                  {shows.map((show, index) => (
                    <tr key={index} className="hover:bg-[var(--color-bg-surface)]/5">
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          className="g-input text-xs w-full"
                          value={show.showDate}
                          onChange={(e) => updateShow(index, 'showDate', e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="Venue name"
                          value={show.venueName}
                          onChange={(e) => updateShow(index, 'venueName', e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="City"
                          value={show.city}
                          onChange={(e) => updateShow(index, 'city', e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="State"
                          value={show.state}
                          onChange={(e) => updateShow(index, 'state', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="g-input text-xs w-full"
                          placeholder="Country"
                          value={show.country}
                          onChange={(e) => updateShow(index, 'country', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="g-input text-xs w-full"
                          placeholder="Cap"
                          value={show.capacity || ''}
                          onChange={(e) => updateShow(index, 'capacity', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeShow(index)}
                          className="text-danger hover:text-danger text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-[var(--color-bg-border)] rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No shows added yet. Upload a schedule or add shows manually.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-[var(--color-bg-border)]">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 border border-[var(--color-bg-border)] rounded-lg hover:bg-[var(--color-bg-surface)]/5 transition text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Previous
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-semibold"
        >
          Next: Add Products <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
