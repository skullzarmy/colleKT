"use client";

import { useParams, useRouter } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function GalleryPage() {
    const params = useParams();
    const router = useRouter();
    const address = params.address as string;

    const handlePageChange = (page: number) => {
        if (page === 1) {
            // Stay on current route (we're already on page 1)
            router.push(`/gallery/${address}`);
        } else {
            // Navigate to specific page route
            router.push(`/gallery/${address}/page/${page}`);
        }
    };

    return (
        <UnifiedGallery
            address={address}
            currentPage={1}
            isBasePage={true}
            enableDocumentTitle={true}
            onPageChange={handlePageChange}
        />
    );
}
