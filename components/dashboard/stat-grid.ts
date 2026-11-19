/**
 * The grid every row of stat tiles uses: 2 columns on phones, up to 6 on wide
 * screens, so tiles stay compact instead of stretching across the page.
 * A plain module (not 'use client') so server components and loading
 * skeletons can import the class string.
 */
export const STAT_GRID = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5';
