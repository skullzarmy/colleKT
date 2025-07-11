"use client";

import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import UnifiedGallery from "@/components/UnifiedGallery";

export default function CollectionPage() {
    const params = useParams();
    const address = params.address as string;

    // Validate contract address format (KT1...)
    const isValidContract = /^KT1[a-zA-Z0-9]{33}$/.test(address);
    if (!isValidContract) {
        notFound();
    }

    // Use the contract address as the address parameter for UnifiedGallery
    // The UnifiedGallery will handle the data fetching based on the route
    return <UnifiedGallery address={address} currentPage={1} isBasePage={true} enableDocumentTitle={true} />;
}
