import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CURRENT_DRAFT_YEAR } from "@/lib/sheets";

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://draftmap.app/draft',
  },
};

export default function DraftPage() {
  redirect(`/draft/${CURRENT_DRAFT_YEAR}`);
}
