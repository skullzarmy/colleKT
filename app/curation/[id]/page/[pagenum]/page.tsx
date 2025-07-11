"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function CurationPageWithPagination() {
    const params = useParams();
    const id = params.id as string;
    const pagenum = params.pagenum as string;

    // Validate curation ID format (integer or 8-char hex slug)
    const isValidId = /^\d+$/.test(id) || /^[a-f0-9]{8}$/.test(id);
    if (!isValidId) {
        notFound();
    }

    // Validate and parse page number
    const pageNumber = parseInt(pagenum, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
        notFound();
    }

    return <UnifiedGallery address={id} currentPage={pageNumber} isBasePage={false} enableDocumentTitle={true} />;
}
