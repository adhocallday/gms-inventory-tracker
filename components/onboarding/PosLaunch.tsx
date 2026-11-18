'use client';

import { useEffect, useState } from 'react';
import { POS_APP_SCHEME } from '@/lib/apps';

function isAppleTouchDevice() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/**
 * The demo video on every device. Reviewers don't have the app installed, so
 * the merchflow:// link is only an extra line on iPad/iPhone, for testers who do.
 */
export function PosLaunch() {
  const [isAppleTouch, setIsAppleTouch] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);

  useEffect(() => {
    setIsAppleTouch(isAppleTouchDevice());
  }, []);

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
      {isAppleTouch && (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Testers with the app installed can{' '}
          <a href={POS_APP_SCHEME} className="underline hover:text-[var(--color-text-primary)]">
            open MerchFlow POS
          </a>
          .
        </p>
      )}
    </div>
  );
}
