'use client';

// Actual PostHog key goes in Vercel env vars (Settings → Environment Variables).
// NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST — see .env.local.example.
// The app no-ops cleanly when the key is absent.

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { POSTHOG_KEY, POSTHOG_HOST } from '@/lib/posthog';

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url =
      window.location.origin +
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (POSTHOG_KEY) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false,
      });
      // Sprint 1 item 5: `?internal` opts THIS browser out of analytics permanently
      // (PostHog persists the opt-out in the browser itself). Must live here in the
      // PROVIDER init effect — a child effect (PageViewTracker) runs before the parent's,
      // so opting out there would act on an uninitialized client. Read the flag straight
      // off the URL; no hook. Derek visits draftmap.app/?internal once per device.
      if (new URLSearchParams(window.location.search).has('internal')) {
        posthog.opt_out_capturing();
        console.info('[draftmap] analytics opt-out set for this browser');
      }
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
