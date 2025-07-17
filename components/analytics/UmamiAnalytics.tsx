"use client";

import Script from "next/script";

/**
 * Umami Analytics Component
 *
 * Loads Umami analytics script when NEXT_PUBLIC_UMAMI_WEBSITE_ID is provided.
 * Umami is a privacy-focused, GDPR-compliant analytics solution that provides
 * anonymous website traffic insights without tracking personal data.
 *
 * @see https://umami.is/
 */
export default function UmamiAnalytics() {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL || "https://cloud.umami.is/script.js";

    // Only load analytics if website ID is provided
    if (!websiteId) {
        return null;
    }

    return <Script src={scriptUrl} data-website-id={websiteId} strategy="afterInteractive" defer />;
}
