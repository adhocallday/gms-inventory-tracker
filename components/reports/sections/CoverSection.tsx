'use client';

import { format } from 'date-fns';

interface CoverSectionProps {
  tour: any;
  report: any;
  showCount: number;
}

export function CoverSection({ tour, report, showCount }: CoverSectionProps) {
  const startDate = tour.start_date ? format(new Date(tour.start_date), 'MMMM d, yyyy') : 'TBA';
  const endDate = tour.end_date ? format(new Date(tour.end_date), 'MMMM d, yyyy') : 'TBA';

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center p-12 print:min-h-[11in] print:page-break-after-always">
      <div className="max-w-3xl space-y-8">
        {/* Tour Name */}
        <h1 className="text-6xl font-bold g-title print:text-7xl">
          {tour.name}
        </h1>

        {/* Report Title */}
        <div className="text-3xl text-[var(--g-text-muted)] print:text-4xl">
          {report.title}
        </div>

        {/* Tour Info */}
        <div className="space-y-2 text-lg text-[var(--g-text-muted)]">
          <p>{startDate} - {endDate}</p>
          <p>{showCount} Shows</p>
        </div>

        {/* Generated Date */}
        <div className="pt-8 text-sm text-[var(--g-text-muted)]">
          Generated {format(new Date(report.created_at), 'MMMM d, yyyy')}
        </div>
      </div>
    </section>
  );
}
