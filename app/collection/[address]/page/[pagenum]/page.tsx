"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function CollectionPageWithPagination() {
    const params = useParams();
    const address = params.address as string;
    const pagenum = params.pagenum as string;

    // Validate contract address format (KT1...)
    const isValidContract = /^KT1[a-zA-Z0-9]{33}$/.test(address);
    if (!isValidContract) {
        notFound();
    }

    // Validate and parse page number
    const pageNumber = parseInt(pagenum, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
        notFound();
    }

    return <UnifiedGallery address={address} currentPage={pageNumber} isBasePage={false} enableDocumentTitle={true} />;
}
