'use client';

// Actual PostHog key goes in Vercel env vars (Settings → Environment Variables).
// NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST — see .env.local.example.
// The app no-ops cleanly when the key is absent.

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { usePathname } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { POSTHOG_KEY, POSTHOG_HOST } from '@/lib/posthog';

function PageViewTracker() {
  const pathname = usePathname();

  // Fires on PATH change only (2026-08-02). The chart mirrors act + card + filters into the
  // query string, so a searchParams dep counted every filter toggle and every act transition
  // as a pageview. The query string is still captured — read live at fire time — so a deep
  // link's full URL is recorded exactly once.
  useEffect(() => {
    posthog.capture('$pageview', {
      $current_url: window.location.origin + pathname + window.location.search,
    });
  }, [pathname]);

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
