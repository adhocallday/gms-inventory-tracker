'use client';

import { useState, useEffect } from 'react';

interface Tour {
  id: string;
  name: string;
  artist: string;
}

interface Show {
  id: string;
  show_date: string;
  venue_name: string;
  city?: string;
  state?: string;
}

interface TourShowSelectorProps {
  tourId?: string;
  showId?: string;
  docType: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  onChange: (tourId: string | null, showId: string | null) => void;
}

export default function TourShowSelector({
  tourId,
  showId,
  docType,
  onChange,
}: TourShowSelectorProps) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedTourId, setSelectedTourId] = useState(tourId || '');
  const [selectedShowId, setSelectedShowId] = useState(showId || '');
  const [loadingTours, setLoadingTours] = useState(true);
  const [loadingShows, setLoadingShows] = useState(false);

  // Determine if this document type requires a show
  const requiresShow = docType === 'sales-report' || docType === 'settlement';

  // Fetch tours
  useEffect(() => {
    async function fetchTours() {
      try {
        const res = await fetch('/api/tours');
        if (res.ok) {
          const data = await res.json();
          setTours(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch tours:', err);
      } finally {
        setLoadingTours(false);
      }
    }
    fetchTours();
  }, []);

  // Fetch shows when tour is selected
  useEffect(() => {
    async function fetchShows() {
      if (!selectedTourId) {
        setShows([]);
        return;
      }

      setLoadingShows(true);
      try {
        const res = await fetch(`/api/tours/${selectedTourId}/shows`);
        if (res.ok) {
          const data = await res.json();
          setShows(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch shows:', err);
        setShows([]);
      } finally {
        setLoadingShows(false);
      }
    }

    if (requiresShow) {
      fetchShows();
    }
  }, [selectedTourId, requiresShow]);

  const handleTourChange = (newTourId: string) => {
    setSelectedTourId(newTourId);
    setSelectedShowId('');
    onChange(newTourId || null, null);
  };

  const handleShowChange = (newShowId: string) => {
    setSelectedShowId(newShowId);
    onChange(selectedTourId || null, newShowId || null);
  };

  return (
    <div className="g-panel space-y-4">
      <div>
        <h3 className="text-lg font-semibold g-title mb-4">
          Tour & Show Assignment
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          {requiresShow
            ? 'Select the tour and show this document belongs to.'
            : 'Select the tour this document belongs to.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tour Selection */}
        <div>
          <label className="g-label block mb-1">
            Tour <span className="text-[var(--color-red-primary)]">*</span>
          </label>
          <select
            className="g-input"
            value={selectedTourId}
            onChange={(e) => handleTourChange(e.target.value)}
            disabled={loadingTours}
          >
            <option value="">Select a tour...</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name} ({tour.artist})
              </option>
            ))}
          </select>
        </div>

        {/* Show Selection (only for sales-report and settlement) */}
        {requiresShow && (
          <div>
            <label className="g-label block mb-1">
              Show {requiresShow && <span className="text-[var(--color-red-primary)]">*</span>}
            </label>
            <select
              className="g-input"
              value={selectedShowId}
              onChange={(e) => handleShowChange(e.target.value)}
              disabled={!selectedTourId || loadingShows}
            >
              <option value="">
                {!selectedTourId
                  ? 'Select a tour first...'
                  : loadingShows
                  ? 'Loading shows...'
                  : 'Select a show...'}
              </option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>
                  {show.show_date} - {show.venue_name}{' '}
                  {show.city && show.state ? `(${show.city}, ${show.state})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
