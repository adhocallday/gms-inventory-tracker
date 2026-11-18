'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ONBOARDING_KEY } from './tour-control';

/** Sends a first-time visitor from / to /welcome, once. /welcome records the visit. */
export function FirstVisitRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ONBOARDING_KEY) === null) router.replace('/welcome');
    } catch {
      // Storage blocked: never redirect, or the visitor could loop.
    }
  }, [router]);
  return null;
}


