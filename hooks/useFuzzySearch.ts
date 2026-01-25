import { useMemo } from 'react';
import Fuse from 'fuse.js';

interface UseFuzzySearchOptions<T> {
  /** Keys to search in the items */
  keys: Array<keyof T | string>;
  /** Search threshold (0.0 = perfect match, 1.0 = match anything) */
  threshold?: number;
  /** Minimum match character length */
  minMatchCharLength?: number;
  /** Include score in results */
  includeScore?: boolean;
  /** Include matches in results */
  includeMatches?: boolean;
}

/**
 * Hook for fuzzy searching through a list of items using Fuse.js
 *
 * @example
 * const filteredTours = useFuzzySearch(tours, searchQuery, {
 *   keys: ['name', 'artist'],
 *   threshold: 0.3
 * });
 */
export function useFuzzySearch<T>(
  items: T[],
  query: string,
  options: UseFuzzySearchOptions<T>
): T[] {
  const {
    keys,
    threshold = 0.3,
    minMatchCharLength = 2,
    includeScore = false,
    includeMatches = false,
  } = options;

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: keys as string[],
      threshold,
      minMatchCharLength,
      includeScore,
      includeMatches,
      // Additional Fuse.js options for better fuzzy matching
      ignoreLocation: true, // Search in strings regardless of location
      findAllMatches: true, // Continue searching after first match
      useExtendedSearch: false,
    });
  }, [items, keys, threshold, minMatchCharLength, includeScore, includeMatches]);

  const results = useMemo(() => {
    if (!query || query.trim().length === 0) {
      return items;
    }

    const searchResults = fuse.search(query);
    return searchResults.map((result) => result.item);
  }, [fuse, query, items]);

  return results;
}

/**
 * Hook for fuzzy searching with scoring information
 * Returns both the filtered items and their match scores
 */
export function useFuzzySearchWithScore<T>(
  items: T[],
  query: string,
  options: Omit<UseFuzzySearchOptions<T>, 'includeScore'>
): Array<{ item: T; score?: number }> {
  const {
    keys,
    threshold = 0.3,
    minMatchCharLength = 2,
    includeMatches = false,
  } = options;

  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: keys as string[],
      threshold,
      minMatchCharLength,
      includeScore: true,
      includeMatches,
      ignoreLocation: true,
      findAllMatches: true,
    });
  }, [items, keys, threshold, minMatchCharLength, includeMatches]);

  const results = useMemo(() => {
    if (!query || query.trim().length === 0) {
      return items.map((item) => ({ item }));
    }

    return fuse.search(query);
  }, [fuse, query, items]);

  return results;
}

/**
 * Hook for multi-field weighted fuzzy search
 * Allows different weights for different fields
 *
 * @example
 * const results = useWeightedFuzzySearch(tours, searchQuery, [
 *   { key: 'name', weight: 2 },
 *   { key: 'artist', weight: 1.5 },
 *   { key: 'city', weight: 1 }
 * ]);
 */
export function useWeightedFuzzySearch<T>(
  items: T[],
  query: string,
  keys: Array<{ key: keyof T | string; weight: number }>,
  threshold: number = 0.3
): T[] {
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: keys.map((k) => ({ name: k.key as string, weight: k.weight })),
      threshold,
      ignoreLocation: true,
      findAllMatches: true,
    });
  }, [items, keys, threshold]);

  const results = useMemo(() => {
    if (!query || query.trim().length === 0) {
      return items;
    }

    return fuse.search(query).map((result) => result.item);
  }, [fuse, query, items]);

  return results;
}
