'use client';

import { useState, useEffect } from 'react';
import { createServiceClient } from '@/lib/supabase/client';

interface TourData {
  name: string;
  artist: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface TourBasicInfoStepProps {
  tourData: TourData;
  onUpdate: (data: TourData) => void;
  onNext: () => void;
}

export default function TourBasicInfoStep({ tourData, onUpdate, onNext }: TourBasicInfoStepProps) {
  const [existingArtists, setExistingArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewArtistField, setShowNewArtistField] = useState(false);

  useEffect(() => {
    async function fetchArtists() {
      const supabase = createServiceClient();
      const { data: tours } = await supabase
        .from('tours')
        .select('artist')
        .not('artist', 'is', null);

      if (tours) {
        const uniqueArtists = Array.from(new Set(tours.map(t => t.artist).filter(Boolean))) as string[];
        setExistingArtists(uniqueArtists);
      }
      setLoading(false);
    }
    fetchArtists();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourData.name || !tourData.artist || !tourData.startDate || !tourData.endDate) {
      alert('Please fill in all required fields');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold g-title mb-4">Basic Tour Information</h2>
        <p className="text-sm text-[var(--g-text-dim)]">
          Start by entering the basic details about this tour. Select an existing artist or add a new one.
        </p>
      </div>

      {/* Artist Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
          Artist <span className="text-[var(--g-accent)]">*</span>
        </label>

        {!showNewArtistField ? (
          <div className="space-y-2">
            <select
              className="g-input w-full"
              value={tourData.artist}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewArtistField(true);
                  onUpdate({ ...tourData, artist: '' });
                } else {
                  onUpdate({ ...tourData, artist: e.target.value });
                }
              }}
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading artists...' : 'Select an artist'}
              </option>
              {existingArtists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
              <option value="__new__">+ Add new artist</option>
            </select>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              className="g-input w-full"
              placeholder="Enter artist name (e.g., Ghost, Metallica)"
              value={tourData.artist}
              onChange={(e) => onUpdate({ ...tourData, artist: e.target.value })}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowNewArtistField(false);
                onUpdate({ ...tourData, artist: '' });
              }}
              className="text-xs text-[var(--g-text-dim)] hover:text-[var(--g-text)]"
            >
              ← Back to artist selection
            </button>
          </div>
        )}
      </div>

      {/* Tour Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
          Tour Name <span className="text-[var(--g-accent)]">*</span>
        </label>
        <input
          type="text"
          className="g-input w-full"
          placeholder="e.g., Skeletor Tour 2025, Re-Imperatour"
          value={tourData.name}
          onChange={(e) => onUpdate({ ...tourData, name: e.target.value })}
          required
        />
        <p className="text-xs text-[var(--g-text-muted)] mt-1">
          Organized under artist "{tourData.artist || '(select artist above)'}"
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
            Start Date <span className="text-[var(--g-accent)]">*</span>
          </label>
          <input
            type="date"
            className="g-input w-full"
            value={tourData.startDate}
            onChange={(e) => onUpdate({ ...tourData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
            End Date <span className="text-[var(--g-accent)]">*</span>
          </label>
          <input
            type="date"
            className="g-input w-full"
            value={tourData.endDate}
            onChange={(e) => onUpdate({ ...tourData, endDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
          Description (Optional)
        </label>
        <textarea
          className="g-input w-full min-h-[100px]"
          placeholder="Add any additional notes about this tour..."
          value={tourData.description || ''}
          onChange={(e) => onUpdate({ ...tourData, description: e.target.value })}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t border-white/10">
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
        >
          Next: Add Shows →
        </button>
      </div>
    </form>
  );
}
