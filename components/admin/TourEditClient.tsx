'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScheduleChatAssistant from './wizard/ScheduleChatAssistant';

interface Tour {
  id: string;
  name: string;
  artist: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  status: string;
}

interface Show {
  id?: string;
  showDate: string;
  show_date?: string;
  venueName: string;
  venue_name?: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

interface TourProduct {
  id: string;
  products: {
    sku: string;
    description: string;
    product_type: string;
  };
  size: string;
  suggested_retail: number | null;
}

interface TourEditClientProps {
  tour: Tour;
  initialShows: Show[];
  initialProducts: TourProduct[];
}

export default function TourEditClient({ tour, initialShows, initialProducts }: TourEditClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'shows' | 'products'>('info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tour info state
  const [tourData, setTourData] = useState({
    name: tour.name,
    artist: tour.artist,
    startDate: tour.start_date || '',
    endDate: tour.end_date || '',
    description: tour.description || '',
    status: tour.status
  });

  // Shows state
  const [shows, setShows] = useState<Show[]>(
    initialShows.map(s => ({
      id: s.id,
      showDate: s.show_date || s.showDate,
      venueName: s.venue_name || s.venueName,
      city: s.city,
      state: s.state,
      country: s.country || 'US',
      capacity: s.capacity
    }))
  );

  const saveTourInfo = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tours/${tour.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tourData.name,
          artist: tourData.artist,
          start_date: tourData.startDate,
          end_date: tourData.endDate,
          description: tourData.description,
          status: tourData.status
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tour');
      }

      router.refresh();
      alert('Tour information updated successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addManualShow = () => {
    const newShow: Show = {
      showDate: '',
      venueName: '',
      city: '',
      state: '',
      country: 'US'
    };
    setShows([...shows, newShow]);
  };

  const updateShow = (index: number, field: keyof Show, value: string | number) => {
    const updated = [...shows];
    updated[index] = { ...updated[index], [field]: value };
    setShows(updated);
  };

  const removeShow = (index: number) => {
    setShows(shows.filter((_, i) => i !== index));
  };

  const saveShows = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tours/${tour.id}/shows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shows })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save shows');
      }

      router.refresh();
      alert('Shows updated successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="g-container py-12">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin/tours"
            className="text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
          >
            ← Back to tours
          </Link>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
          Admin Panel
        </p>
        <h1 className="text-3xl font-semibold g-title mt-2">
          Edit Tour: {tour.name}
        </h1>
        <p className="text-sm text-[var(--g-text-dim)] mt-2">
          Modify tour details, add shows, and manage products
        </p>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'info'
                ? 'border-[var(--g-accent)] text-[var(--g-text)]'
                : 'border-transparent text-[var(--g-text-muted)] hover:text-[var(--g-text)]'
            }`}
          >
            Tour Information
          </button>
          <button
            onClick={() => setActiveTab('shows')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'shows'
                ? 'border-[var(--g-accent)] text-[var(--g-text)]'
                : 'border-transparent text-[var(--g-text-muted)] hover:text-[var(--g-text)]'
            }`}
          >
            Shows ({shows.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'products'
                ? 'border-[var(--g-accent)] text-[var(--g-text)]'
                : 'border-transparent text-[var(--g-text-muted)] hover:text-[var(--g-text)]'
            }`}
          >
            Products ({initialProducts.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tour Info Tab */}
      {activeTab === 'info' && (
        <div className="g-card p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
                Tour Name
              </label>
              <input
                type="text"
                className="g-input w-full"
                value={tourData.name}
                onChange={(e) => setTourData({ ...tourData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
                Artist
              </label>
              <input
                type="text"
                className="g-input w-full"
                value={tourData.artist}
                onChange={(e) => setTourData({ ...tourData, artist: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
                Start Date
              </label>
              <input
                type="date"
                className="g-input w-full"
                value={tourData.startDate}
                onChange={(e) => setTourData({ ...tourData, startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
                End Date
              </label>
              <input
                type="date"
                className="g-input w-full"
                value={tourData.endDate}
                onChange={(e) => setTourData({ ...tourData, endDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
                Status
              </label>
              <select
                className="g-input w-full"
                value={tourData.status}
                onChange={(e) => setTourData({ ...tourData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
              Description
            </label>
            <textarea
              className="g-input w-full min-h-[100px]"
              value={tourData.description}
              onChange={(e) => setTourData({ ...tourData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={saveTourInfo}
              disabled={saving}
              className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Shows Tab */}
      {activeTab === 'shows' && (
        <div className="space-y-6">
          {/* AI Chat Assistant */}
          <ScheduleChatAssistant
            tourName={tourData.name}
            artist={tourData.artist}
            onShowsExtracted={(extractedShows) => {
              setShows([...shows, ...extractedShows]);
            }}
          />

          {/* Shows Table */}
          <div className="g-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--g-text)]">
                Tour Schedule ({shows.length} shows)
              </h3>
              <button
                type="button"
                onClick={addManualShow}
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium"
              >
                + Add Show
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
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {shows.map((show, index) => (
                        <tr key={show.id || index} className="hover:bg-white/5">
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              className="g-input text-xs w-full"
                              value={show.showDate}
                              onChange={(e) => updateShow(index, 'showDate', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="g-input text-xs w-full"
                              value={show.venueName}
                              onChange={(e) => updateShow(index, 'venueName', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="g-input text-xs w-full"
                              value={show.city}
                              onChange={(e) => updateShow(index, 'city', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="g-input text-xs w-full"
                              value={show.state}
                              onChange={(e) => updateShow(index, 'state', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className="g-input text-xs w-full"
                              value={show.country}
                              onChange={(e) => updateShow(index, 'country', e.target.value)}
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
                  No shows added yet. Use the AI chat assistant above or add manually.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-white/10 mt-6">
              <button
                onClick={saveShows}
                disabled={saving}
                className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Shows'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="g-card p-6">
          <p className="text-sm text-[var(--g-text-muted)]">
            Product management coming soon. Currently showing {initialProducts.length} products.
          </p>
        </div>
      )}
    </div>
  );
}
