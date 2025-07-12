"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface GalleryMetadata {
    name: string;
    description?: string;
    type: "USER" | "CURATION" | "COLLECTION";
    isLoading: boolean;
    error?: string;
    creator_address?: string;
    creator_domain?: string;
}

interface CurationData {
    slug: string;
    name: string;
    description?: string;
    gallery_id: string;
}

interface CollectionData {
    contract: string;
    name: string;
    description?: string;
    symbol?: string;
    creator_address?: string;
    creator_domain?: string;
}

/**
 * Hook to fetch gallery metadata for different gallery types
 * - USER: Uses existing domain resolution
 * - CURATION: Fetches from objkt.com API
 * - COLLECTION: Fetches from objkt.com API
 */
export function useGalleryMetadata(address: string, domain?: string | null, displayName?: string): GalleryMetadata {
    const [metadata, setMetadata] = useState<GalleryMetadata>({
        name: "",
        type: "USER",
        isLoading: true,
    });
    const pathname = usePathname();

    // Determine gallery type from pathname
    const getGalleryType = (): "USER" | "CURATION" | "COLLECTION" => {
        if (pathname.startsWith("/curation/")) {
            return "CURATION";
        } else if (pathname.startsWith("/collection/")) {
            return "COLLECTION";
        } else {
            return "USER";
        }
    };

    useEffect(() => {
        const galleryType = getGalleryType();
        setMetadata((prev) => ({ ...prev, type: galleryType, isLoading: true }));

        async function fetchMetadata() {
            try {
                switch (galleryType) {
                    case "USER":
                        // Use existing domain/displayName logic
                        const userName = domain || displayName || `${address.slice(0, 8)}...${address.slice(-4)}`;
                        setMetadata({
                            name: userName,
                            type: "USER",
                            isLoading: false,
                        });
                        break;

                    case "CURATION":
                        // Fetch curation metadata from objkt.com
                        const curationData = await fetchCurationMetadata(address);
                        setMetadata({
                            name: curationData.name || `Curation ${address}`,
                            description: curationData.description,
                            type: "CURATION",
                            isLoading: false,
                        });
                        break;

                    case "COLLECTION":
                        // Fetch collection metadata from objkt.com
                        const collectionData = await fetchCollectionMetadata(address);
                        setMetadata({
                            name:
                                collectionData.name || collectionData.symbol || `Collection ${address.slice(0, 8)}...`,
                            description: collectionData.description,
                            type: "COLLECTION",
                            isLoading: false,
                            creator_address: collectionData.creator_address,
                            creator_domain: collectionData.creator_domain,
                        });
                        break;
                }
            } catch (error) {
                console.error("Failed to fetch gallery metadata:", error);
                setMetadata({
                    name: getFailbackName(galleryType, address, domain, displayName),
                    type: galleryType,
                    isLoading: false,
                    error: "Failed to load metadata",
                });
            }
        }

        fetchMetadata();
    }, [address, domain, displayName, pathname]);

    return metadata;
}

/**
 * Fetch curation metadata from objkt.com GraphQL API
 */
async function fetchCurationMetadata(curationId: string): Promise<CurationData> {
    // Support different curation ID formats
    let query: string;
    let variables: any;

    if (/^\d+$/.test(curationId)) {
        // Numeric ID - not directly supported, fallback to error
        throw new Error("Numeric curation IDs not supported");
    } else if (/^[a-f0-9]{8}$/.test(curationId)) {
        // 8-character hex slug
        query = `
            query GetCurationMetadataBySlug($slug: String!) {
                gallery(
                    where: {
                        slug: {_eq: $slug}
                    }
                    limit: 1
                ) {
                    gallery_id
                    name
                    description
                    slug
                }
            }
        `;
        variables = { slug: curationId };
    } else if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(curationId)) {
        // Full UUID
        query = `
            query GetCurationMetadataByGalleryId($gallery_id: String!) {
                gallery(
                    where: {
                        gallery_id: {_eq: $gallery_id}
                    }
                    limit: 1
                ) {
                    gallery_id
                    name
                    description
                    slug
                }
            }
        `;
        variables = { gallery_id: curationId };
    } else {
        throw new Error("Invalid curation ID format");
    }

    const response = await fetch("https://data.objkt.com/v3/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            variables,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(data.errors[0]?.message || "GraphQL error");
    }

    const gallery = data.data?.gallery?.[0];
    if (!gallery) {
        throw new Error("Curation not found");
    }

    return {
        slug: gallery.slug,
        name: gallery.name,
        description: gallery.description,
        gallery_id: gallery.gallery_id,
    };
}

/**
 * Fetch collection metadata from objkt.com GraphQL API
 */
async function fetchCollectionMetadata(contractAddress: string): Promise<CollectionData> {
    const query = `
        query GetCollectionMetadata($contract: String!) {
            fa(where: { contract: { _eq: $contract } }, limit: 1) {
                contract
                name
                description
                short_name
                category
                creator_address
            }
        }
    `;

    const response = await fetch("https://data.objkt.com/v3/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            variables: { contract: contractAddress },
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(data.errors[0]?.message || "GraphQL error");
    }

    const collection = data.data?.fa?.[0];
    if (!collection) {
        throw new Error("Collection not found");
    }

    // Try to resolve creator domain if we have a creator address
    let creator_domain;
    if (collection.creator_address) {
        try {
            const domainResponse = await fetch(`https://api.tezos.domains/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: `
                        query ResolveDomain($address: String!) {
                            reverseRecord(address: $address) {
                                domain {
                                    name
                                }
                            }
                        }
                    `,
                    variables: { address: collection.creator_address },
                }),
            });

            if (domainResponse.ok) {
                const domainData = await domainResponse.json();
                creator_domain = domainData.data?.reverseRecord?.domain?.name;
            }
        } catch (error) {
            // Silently fail domain resolution
            console.log("Failed to resolve creator domain:", error);
        }
    }

    return {
        contract: contractAddress,
        name: collection.name || collection.short_name || `Collection ${contractAddress.slice(0, 8)}...`,
        description: collection.description,
        symbol: collection.short_name,
        creator_address: collection.creator_address,
        creator_domain,
    };
}

/**
 * Generate fallback name when metadata fetch fails
 */
function getFailbackName(
    type: "USER" | "CURATION" | "COLLECTION",
    address: string,
    domain?: string | null,
    displayName?: string
): string {
    switch (type) {
        case "USER":
            return domain || displayName || `${address.slice(0, 8)}...${address.slice(-4)}`;
        case "CURATION":
            return `Curation ${address}`;
        case "COLLECTION":
            return `Collection ${address.slice(0, 8)}...`;
        default:
            return address;
    }
}
