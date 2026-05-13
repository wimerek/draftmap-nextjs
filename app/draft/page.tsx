import { redirect } from "next/navigation";
import { CURRENT_DRAFT_YEAR } from "@/lib/sheets";

/**
 * /draft — redirects to the most recent draft year.
 * Keeps the URL canonical at /draft/[year] for SEO and shareability.
 */
export default function DraftPage() {
  redirect(`/draft/${CURRENT_DRAFT_YEAR}`);
}
