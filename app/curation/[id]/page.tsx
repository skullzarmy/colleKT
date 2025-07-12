"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function CurationPage() {
    const params = useParams();
    const id = params.id as string;

    // Validate curation ID format (integer, 8-char hex slug, or full UUID)
    const isValidId =
        /^\d+$/.test(id) ||
        /^[a-f0-9]{8}$/.test(id) ||
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
    if (!isValidId) {
        notFound();
    }

    // Use the curation ID as the address parameter for UnifiedGallery
    // The UnifiedGallery will handle the data fetching based on the route
    return <UnifiedGallery address={id} currentPage={1} isBasePage={true} enableDocumentTitle={true} />;
}
