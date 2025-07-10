"use client";

import { useParams, useRouter } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function GalleryPageWithNumber() {
    const params = useParams();
    const router = useRouter();
    const address = params.address as string;
    const pagenum = params.pagenum as string;

    // Parse and validate page number
    const currentPage = (() => {
        const pageNumber = parseInt(pagenum);
        if (isNaN(pageNumber) || pageNumber <= 0) {
            // Invalid page number, redirect to page 1
            router.replace(`/gallery/${address}`);
            return 1;
        }
        return pageNumber;
    })();

    return (
        <UnifiedGallery address={address} currentPage={currentPage} isBasePage={false} enableDocumentTitle={false} />
    );
}
