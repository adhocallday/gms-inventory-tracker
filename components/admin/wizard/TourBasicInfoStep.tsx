'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';

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
    if (!tourData.name || !tourData.artist) {
      alert('Please fill in tour name and artist');
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Basic tour information</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Start by entering the basic details about this tour. Select an existing artist or add a new one.
        </p>
      </div>

      {/* Artist Selection */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Artist <span className="text-danger" aria-hidden="true">*</span>
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
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Back to artist selection
            </button>
          </div>
        )}
      </div>

      {/* Tour Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Tour name <span className="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          className="g-input w-full"
          placeholder="e.g. SKELETOUR 2025, Re-Imperatour"
          value={tourData.name}
          onChange={(e) => onUpdate({ ...tourData, name: e.target.value })}
          required
        />
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Organized under artist "{tourData.artist || '(select artist above)'}"
        </p>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Start date <span className="text-xs text-[var(--color-text-secondary)]">(Optional - auto-fills from shows)</span>
          </label>
          <input
            type="date"
            className="g-input w-full"
            value={tourData.startDate}
            onChange={(e) => onUpdate({ ...tourData, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            End date <span className="text-xs text-[var(--color-text-secondary)]">(Optional - auto-fills from shows)</span>
          </label>
          <input
            type="date"
            className="g-input w-full"
            value={tourData.endDate}
            onChange={(e) => onUpdate({ ...tourData, endDate: e.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] -mt-2">
        <Lightbulb className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Leave dates blank - they'll automatically populate based on show schedule in the next step
      </p>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
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
      <div className="flex justify-end pt-6 border-t border-[var(--color-bg-border)]">
        <button
          type="submit"
          className="px-6 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition font-semibold"
        >
          Next: Add Shows <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
