'use client';

import { useState } from 'react';

type WarehouseLocation = {
  id: string;
  tour_id: string;
  name: string;
  location_type: 'standard' | 'custom';
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type WarehouseLocationManagerProps = {
  tourId: string;
  initialLocations: WarehouseLocation[];
};

export function WarehouseLocationManager({
  tourId,
  initialLocations
}: WarehouseLocationManagerProps) {
  const [locations, setLocations] = useState<WarehouseLocation[]>(initialLocations);
  const [newLocationName, setNewLocationName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      setError('Location name cannot be empty');
      return;
    }

    clearMessages();
    setAdding(true);

    try {
      const response = await fetch(`/api/tours/${tourId}/warehouse-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create location');
      }

      setLocations([...locations, data.location]);
      setNewLocationName('');
      setSuccess(`Location "${data.location.name}" created successfully`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleEditLocation = async (locationId: string) => {
    if (!editName.trim()) {
      setError('Location name cannot be empty');
      return;
    }

    clearMessages();

    try {
      const response = await fetch(`/api/warehouse-locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setLocations(locations.map(loc =>
        loc.id === locationId ? data.location : loc
      ));
      setEditing(null);
      setEditName('');
      setSuccess(`Location updated successfully`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (location: WarehouseLocation) => {
    clearMessages();

    try {
      const response = await fetch(`/api/warehouse-locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !location.is_active })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setLocations(locations.map(loc =>
        loc.id === location.id ? data.location : loc
      ));
      setSuccess(`Location ${!location.is_active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLocation = async (location: WarehouseLocation) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"?`)) {
      return;
    }

    clearMessages();

    try {
      const response = await fetch(`/api/warehouse-locations/${location.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      if (data.deleted) {
        // Hard delete - remove from list
        setLocations(locations.filter(loc => loc.id !== location.id));
        setSuccess('Location deleted successfully');
      } else if (data.deactivated) {
        // Soft delete - mark as inactive
        setLocations(locations.map(loc =>
          loc.id === location.id ? { ...loc, is_active: false } : loc
        ));
        setSuccess('Location deactivated (has existing allocations)');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReorder = async (locationId: string, direction: 'up' | 'down') => {
    const index = locations.findIndex(loc => loc.id === locationId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= locations.length) return;

    // Swap display orders
    const reordered = [...locations];
    const temp = reordered[index];
    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;

    // Update display_order values
    const updatedLocations = reordered.map((loc, idx) => ({
      ...loc,
      display_order: idx + 1
    }));

    setLocations(updatedLocations);

    // Save to backend
    try {
      await Promise.all(
        updatedLocations.map(loc =>
          fetch(`/api/warehouse-locations/${loc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: loc.display_order })
          })
        )
      );
    } catch (err: any) {
      setError('Failed to save new order');
      // Revert on error
      setLocations(locations);
    }
  };

  const standardLocations = locations.filter(loc => loc.location_type === 'standard');
  const customLocations = locations.filter(loc => loc.location_type === 'custom');

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 border border-[rgba(225,6,20,0.35)] rounded-lg bg-[rgba(225,6,20,0.08)]">
          <p className="text-sm text-[var(--color-red-primary)]">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {success && (
        <div className="p-4 border border-green-500/20 rounded-lg bg-green-500/10">
          <p className="text-sm text-green-500">
            <strong>Success:</strong> {success}
          </p>
        </div>
      )}

      {/* Template Locations */}
      <div className="g-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold g-title">Template Locations</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Suggested stock locations (fully editable)
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
            {standardLocations.filter(l => l.is_active).length} active
          </span>
        </div>

        <div className="space-y-2">
          {standardLocations.map((location, index) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-3 border border-white/10 rounded-lg bg-[var(--color-bg-surface)]"
            >
              <div className="flex items-center gap-3 flex-1">
                {editing === location.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="g-input flex-1"
                    placeholder="e.g., Tour Truck, Nashville Hub"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className={`text-sm font-medium ${
                      location.is_active
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)] line-through'
                    }`}>
                      {location.name}
                    </span>
                    {!location.is_active && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editing === location.id ? (
                  <>
                    <button
                      onClick={() => handleEditLocation(location.id)}
                      className="text-xs px-3 py-1 rounded bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setEditName('');
                      }}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleReorder(location.id, 'up')}
                      disabled={index === 0}
                      className="text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(location.id, 'down')}
                      disabled={index === standardLocations.length - 1}
                      className="text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setEditing(location.id);
                        setEditName(location.name);
                      }}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleToggleActive(location)}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      {location.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          💡 Tip: Rename templates to match your workflow (e.g., "Road" → "Tour Truck", "Warehouse" → "Nashville Hub")
        </p>
      </div>

      {/* Custom Locations */}
      <div className="g-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold g-title">Custom Locations</h2>
          <span className="text-xs text-[var(--color-text-muted)]">
            {customLocations.length} custom location{customLocations.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {customLocations.map((location, index) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-3 border border-white/10 rounded-lg bg-[var(--color-bg-surface)]"
            >
              <div className="flex items-center gap-3 flex-1">
                {editing === location.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="g-input flex-1"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className={`text-sm font-medium ${
                      location.is_active
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)] line-through'
                    }`}>
                      {location.name}
                    </span>
                    {!location.is_active && (
                      <span className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editing === location.id ? (
                  <>
                    <button
                      onClick={() => handleEditLocation(location.id)}
                      className="text-xs px-3 py-1 rounded bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setEditName('');
                      }}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleReorder(location.id, 'up')}
                      disabled={index === 0}
                      className="text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(location.id, 'down')}
                      disabled={index === customLocations.length - 1}
                      className="text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setEditing(location.id);
                        setEditName(location.name);
                      }}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(location)}
                      className="text-xs px-3 py-1 rounded border border-white/10 hover:border-white/30 transition"
                    >
                      {location.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location)}
                      className="text-xs px-3 py-1 rounded border border-[var(--color-red-primary)]/30 text-[var(--color-red-primary)] hover:bg-[var(--color-red-primary)]/10 transition"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {customLocations.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              No custom locations yet. Add one below to get started.
            </p>
          )}
        </div>

        {/* Add New Location */}
        <div className="border-t border-white/10 pt-4">
          <label className="text-xs text-[var(--color-text-muted)] block mb-2">
            Add Custom Location
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !adding) {
                  handleAddLocation();
                }
              }}
              placeholder="e.g., Chicago Hub, LA Warehouse"
              className="g-input flex-1"
            />
            <button
              onClick={handleAddLocation}
              disabled={adding || !newLocationName.trim()}
              className="px-4 py-2 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding...' : 'Add Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
