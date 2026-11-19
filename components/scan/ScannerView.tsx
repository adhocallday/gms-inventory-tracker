'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Contrast, X } from 'lucide-react';
import { pageFromVideo, type PageImage } from './image-process';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ScannerViewProps {
  pageCount: number;
  maxPages: number;
  onCapture: (page: PageImage) => void;
  onClose: () => void;
}

/** Full-screen live camera for capturing several document pages in a row. Ported from gms-document-parser. */
export function ScannerView({ pageCount, maxPages, onCapture, onClose }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [busy, setBusy] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Live scanning is not available in this browser. Use Camera or Photos instead.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setReady(true);
      } catch (err) {
        const name = err instanceof DOMException ? err.name : '';
        setError(
          name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow camera access for this site in your browser settings, or use Camera or Photos.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device. Use Photos instead.'
              : 'The camera could not be started. Use Camera or Photos instead.',
        );
      }
    })();

    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || busy || pageCount >= maxPages) return;
    setBusy(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    try {
      onCapture(await pageFromVideo(video, enhance));
      navigator.vibrate?.(30);
    } finally {
      setBusy(false);
    }
  };

  const full = pageCount >= maxPages;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Document scanner">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10" aria-label="Close scanner">
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'} scanned
        </p>
        <button
          type="button"
          onClick={() => setEnhance((v) => !v)}
          aria-pressed={enhance}
          className={cn(
            'flex h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold',
            enhance ? 'bg-[var(--color-red-primary)]' : 'bg-white/10',
          )}
        >
          <Contrast className="h-4 w-4" />
          Enhance
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ filter: enhance ? 'grayscale(1) contrast(1.3)' : undefined }}
        />
        {ready && (
          <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] sm:inset-x-[15%]">
            <p className="absolute -top-8 left-0 right-0 text-center text-xs text-white/80">Fit the page inside the frame</p>
          </div>
        )}
        {flash && <div className="absolute inset-0 bg-white/70" />}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-sm text-center text-sm text-white/90">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="w-24 text-xs text-white/60">{full ? `Limit of ${maxPages} pages` : 'Tap to capture'}</div>
        <button
          type="button"
          onClick={capture}
          disabled={!ready || busy || full}
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
          aria-label="Capture page"
        >
          <Camera className="h-7 w-7" />
        </button>
        <div className="flex w-24 justify-end">
          <Button size="md" onClick={onClose} disabled={pageCount === 0}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
