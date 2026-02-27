'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp, Package } from 'lucide-react';

interface ReorderAlert {
  sku: string;
  size: string | null;
  minimum_balance: number;
  reorder_quantity: number | null;
  lead_time_days: number | null;
  current_projected_balance: number;
  first_stockout_date: string | null;
  first_stockout_show: number | null;
}

interface ReorderAlertBannerProps {
  tourId: string;
  scenarioId: string;
}

export function ReorderAlertBanner({ tourId, scenarioId }: ReorderAlertBannerProps) {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      if (!tourId || !scenarioId) return;

      try {
        const response = await fetch(
          `/api/tours/${tourId}/reorder-thresholds?include_alerts=true&scenario_id=${scenarioId}`
        );
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error('Failed to load reorder alerts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
  }, [tourId, scenarioId]);

  if (isLoading || isDismissed || alerts.length === 0) {
    return null;
  }

  const criticalAlerts = alerts.filter((a) => a.current_projected_balance < 0);
  const warningAlerts = alerts.filter((a) => a.current_projected_balance >= 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900">
              {alerts.length} Product{alerts.length !== 1 ? 's' : ''} Need Attention
            </h3>
            <p className="text-sm text-amber-700">
              {criticalAlerts.length > 0 && (
                <span className="text-red-600 font-medium">
                  {criticalAlerts.length} projected stockout{criticalAlerts.length !== 1 ? 's' : ''}
                </span>
              )}
              {criticalAlerts.length > 0 && warningAlerts.length > 0 && ' · '}
              {warningAlerts.length > 0 && (
                <span>{warningAlerts.length} below reorder threshold</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition"
          >
            {isExpanded ? 'Hide' : 'Show'} Details
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-amber-200 p-4 bg-[var(--color-bg-surface)]/50">
          <div className="space-y-2">
            {/* Critical alerts first */}
            {criticalAlerts.map((alert) => (
              <div
                key={`${alert.sku}:${alert.size ?? ''}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg gap-2"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-medium text-red-900">
                      {alert.sku}
                      {alert.size && (
                        <span className="text-red-600 ml-1">({alert.size})</span>
                      )}
                    </div>
                    <div className="text-xs text-red-700">
                      Stockout projected at Show #{alert.first_stockout_show} (
                      {formatDate(alert.first_stockout_date)})
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right pl-7 sm:pl-0">
                  <div className="text-sm font-semibold text-red-700">
                    {alert.current_projected_balance} units
                  </div>
                  <div className="text-xs text-red-600">
                    Min: {alert.minimum_balance}
                    {alert.reorder_quantity && ` · Reorder: ${alert.reorder_quantity}`}
                  </div>
                </div>
              </div>
            ))}

            {/* Warning alerts */}
            {warningAlerts.map((alert) => (
              <div
                key={`${alert.sku}:${alert.size ?? ''}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg gap-2"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-sm font-medium text-amber-900">
                      {alert.sku}
                      {alert.size && (
                        <span className="text-amber-600 ml-1">({alert.size})</span>
                      )}
                    </div>
                    <div className="text-xs text-amber-700">
                      Falls below threshold at Show #{alert.first_stockout_show} (
                      {formatDate(alert.first_stockout_date)})
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right pl-7 sm:pl-0">
                  <div className="text-sm font-semibold text-amber-700">
                    {alert.current_projected_balance} units
                  </div>
                  <div className="text-xs text-amber-600">
                    Min: {alert.minimum_balance}
                    {alert.reorder_quantity && ` · Reorder: ${alert.reorder_quantity}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <button className="px-3 py-2 sm:py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition">
              Configure Thresholds
            </button>
            <button className="px-3 py-2 sm:py-1.5 text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition">
              Create Reorder
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
