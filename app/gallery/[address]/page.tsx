"use client";

import { useParams } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function GalleryPage() {
    const params = useParams();
    const address = params.address as string;

    return <UnifiedGallery address={address} currentPage={1} isBasePage={true} enableDocumentTitle={true} />;
}
