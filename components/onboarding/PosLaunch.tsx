'use client';

import { useEffect, useState } from 'react';
import { POS_APP_SCHEME } from '@/lib/apps';

function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** "Open MerchFlow POS" on iPad/iPhone; TestFlight note and the demo video elsewhere. */
export function PosLaunch() {
  const [device, setDevice] = useState<'unknown' | 'ios' | 'desktop'>('unknown');
  const [videoMissing, setVideoMissing] = useState(false);

  useEffect(() => {
    setDevice(isAppleTouchDevice() ? 'ios' : 'desktop');
  }, []);

  if (device === 'unknown') return <div className="h-10" aria-hidden="true" />;

  if (device === 'ios') {
    return (
      <div className="space-y-2">
        <a
          href={POS_APP_SCHEME}
          className="inline-flex items-center h-11 px-5 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition"
        >
          Open MerchFlow POS
        </a>
        <p className="text-sm text-[var(--color-text-muted)]">
          Opens the app if it is installed on this device. It is available to testers soon via TestFlight.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="inline-flex items-center rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm font-medium">
        Available to testers soon via TestFlight
      </p>
      {!videoMissing && (
        <video
          src="/pos-demo.mp4"
          controls
          playsInline
          preload="metadata"
          onError={() => setVideoMissing(true)}
          data-tour="pos-video"
          className="w-full max-w-sm rounded-lg border border-[var(--color-bg-border)] bg-black"
        >
          A walkthrough video of MerchFlow POS.
        </video>
      )}
    </div>
  );
}
