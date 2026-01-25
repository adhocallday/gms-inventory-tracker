'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse schedule');
      }

      const result = await response.json();
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
        <h2 className="text-xl font-semibold g-title mb-4">Tour Schedule & Shows</h2>
        <p className="text-sm text-[var(--g-text-dim)]">
          Upload a tour schedule PDF/CSV or add shows manually. AI will extract show dates, venues, and cities.
        </p>
      </div>

      {/* AI Upload Area */}
      <div className="p-6 border border-white/10 rounded-lg bg-[var(--g-surface-2)]">
        <h3 className="text-sm font-semibold text-[var(--g-text)] mb-3">
          AI-Assisted Upload
        </h3>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
            ${isDragActive ? 'border-[var(--g-accent)] bg-[rgba(225,6,20,0.08)]' : 'border-white/15 hover:border-white/30'}
            ${parsing ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--g-accent)] mx-auto"></div>
              <p className="text-sm text-[var(--g-text-dim)]">Parsing schedule with AI...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg className="mx-auto h-10 w-10 text-[var(--g-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-[var(--g-text-dim)]">
                {isDragActive ? 'Drop the file here' : 'Drag & drop tour schedule PDF/CSV, or click to select'}
              </p>
              <p className="text-xs text-[var(--g-text-muted)]">
                Supports PDF, CSV, XLS, XLSX
              </p>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Shows Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--g-text)]">
            Shows ({shows.length})
          </h3>
          <button
            type="button"
            onClick={addManualShow}
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
          >
            + Add Show Manually
          </button>
        </div>

        {shows.length > 0 ? (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">Venue</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">State</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--g-text-muted)]">Capacity</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {shows.map((show, index) => (
                    <tr key={index} className="hover:bg-white/5">
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
                          className="text-red-400 hover:text-red-300 text-xs"
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
          <div className="border border-white/10 rounded-lg p-8 text-center">
            <p className="text-sm text-[var(--g-text-muted)]">
              No shows added yet. Upload a schedule or add shows manually.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition text-[var(--g-text)]"
        >
          ← Previous
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
        >
          Next: Add Products →
        </button>
      </div>
    </form>
  );
}
