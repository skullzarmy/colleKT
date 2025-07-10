"use client";

import { useEffect, useState, Component } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";
import { useTezosDomain } from "@/hooks/use-tezos-domain";
import { collektClient } from "@/lib/data/sources/collekt-client";
import { UnifiedToken } from "@/lib/data/types/token-types";
import * as THREE from "three";

// Dynamically import Gallery3D with no SSR to prevent hydration issues
const Gallery3D = dynamic(() => import("@/components/Gallery3D"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="space-y-4 text-center">
                <div className="w-12 h-12 mx-auto border-4 rounded-full border-cyan-400 border-t-transparent animate-spin"></div>
                <p className="text-xl text-white">Loading 3D Gallery...</p>
            </div>
        </div>
    ),
});

// Dynamically import MediaModal to prevent serialization issues with function props
const MediaModal = dynamic(() => import("@/components/media-modal"), {
    ssr: false,
});

// Error Boundary Component
class ErrorBoundary extends Component<
    { children: React.ReactNode; fallback: React.ReactNode; onError?: (error: Error) => void },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error("ErrorBoundary caught an error:", error);
        this.props.onError?.(error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Simple 2D Gallery Fallback
function Simple2DGallery({
    nfts,
    onNFTSelect,
    getImageUri,
}: {
    nfts: UnifiedToken[];
    onNFTSelect: (nft: UnifiedToken) => void;
    getImageUri: (nft: UnifiedToken) => string | null;
}) {
    const getIPFSUrl = (uri: string) => {
        if (uri.startsWith("ipfs://")) {
            // Extract CID and preserve any query parameters
            const withoutProtocol = uri.replace("ipfs://", "");
            return `https://ipfs.fileship.xyz/${withoutProtocol}`;
        }
        return uri;
    };

    return (
        <div className="min-h-screen p-8 bg-black">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {nfts.map((nft) => {
                    const imageUri = getImageUri(nft);
                    return (
                        <div
                            key={nft.id}
                            className="overflow-hidden transition-colors bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                            onClick={() => onNFTSelect(nft)}
                        >
                            <div className="flex items-center justify-center bg-gray-900 aspect-square">
                                {imageUri ? (
                                    <img
                                        src={getIPFSUrl(imageUri)}
                                        alt={nft.metadata?.name || `Token #${nft.tokenId}`}
                                        className="object-cover w-full h-full"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            target.parentElement!.innerHTML =
                                                '<div class="text-white text-center">📷<br/>Image Failed</div>';
                                        }}
                                    />
                                ) : (
                                    <div className="text-center text-white">
                                        🖼
                                        <br />
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="text-sm font-medium text-white truncate">
                                    {nft.metadata?.name || `Token #${nft.tokenId}`}
                                </h3>
                                <p className="mt-1 text-xs text-gray-400">{nft.contractAddress.slice(0, 8)}...</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface UnifiedGalleryProps {
    address: string;
    currentPage: number;
    isBasePage?: boolean;
    enableDocumentTitle?: boolean;
}

export default function UnifiedGallery({
    address,
    currentPage,
    isBasePage = false,
    enableDocumentTitle = false,
}: UnifiedGalleryProps) {
    const router = useRouter();
    const { domain, isLoading: domainLoading, displayName } = useTezosDomain(address);
    const [nfts, setNfts] = useState<UnifiedToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<UnifiedToken | null>(null);
    const [use3D, setUse3D] = useState(true);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<string>("Fetching NFTs...");
    const [preloadedTextures, setPreloadedTextures] = useState<Map<string, THREE.Texture>>(new Map());
    const [totalNFTs, setTotalNFTs] = useState<number>(0);

    // Use shared view state instead of local state
    const { cameraMode, setCameraMode } = useViewState();

    // Convert page number to room number (0-based)
    const currentRoom = currentPage - 1;

    // Update page title when domain loads (only if enabled)
    useEffect(() => {
        if (enableDocumentTitle && !domainLoading) {
            const title = domain ? `${domain}'s ColleKT - NFT Gallery` : `${displayName}'s ColleKT - NFT Gallery`;
            document.title = title;
        }
    }, [domain, displayName, domainLoading, enableDocumentTitle]);

    // Refresh handler to force cache rebuild
    const handleRefresh = async () => {
        setLoading(true);
        setLoadingProgress("Clearing cache...");
        setNfts([]);
        setPreloadedTextures(new Map());

        try {
            // First, clear all cache entries for this address
            await fetch("/api/cache/clear", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address,
                    clearAll: true, // Clear ALL cache entries, not just current filter
                }),
            });

            setLoadingProgress("Fetching fresh data...");

            const NFTS_PER_ROOM = 20;

            const response = await collektClient.getTokenCollection({
                address,
                page: currentPage,
                pageSize: NFTS_PER_ROOM,
                forceRefresh: true, // This will force a fresh fetch and rebuild cache
            });

            if (response.success && response.data) {
                const { tokens, pagination } = response.data;
                setTotalNFTs(pagination.totalItems);

                // For base page, filter tokens with metadata and balance
                const processedTokens = isBasePage
                    ? tokens.filter((token: any) => {
                          const hasMetadata = token.metadata;
                          const hasBalance = token.balance > 0;
                          return hasMetadata && hasBalance;
                      })
                    : tokens;

                setNfts(processedTokens);
                setLoadingProgress("Preloading textures...");
                await preloadTextures(processedTokens, 0, pagination.totalItems);
            }
        } catch (err) {
            console.error("Error refreshing collection:", err);
            setError("Failed to refresh collection. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Update URL when room changes - navigate to appropriate route
    const updateRoomInUrl = (roomNumber: number) => {
        const newPage = roomNumber + 1;
        if (newPage === 1) {
            // Going to page 1, use base route
            router.push(`/gallery/${address}`);
        } else {
            // Going to specific page, use dynamic route
            router.push(`/gallery/${address}/page/${newPage}`);
        }
    };

    // Preload more textures when room changes
    useEffect(() => {
        if (nfts.length > 0 && !loading) {
            const preloadForRoom = async () => {
                await preloadTextures(nfts, currentRoom, totalNFTs);
            };
            preloadForRoom();
        }
    }, [currentRoom, nfts.length, loading, totalNFTs]);

    useEffect(() => {
        if (!address) return;

        const fetchNFTsForPage = async () => {
            try {
                setLoading(true);
                setError(null);

                const NFTS_PER_ROOM = 20;

                setLoadingProgress(
                    isBasePage ? `Fetching room ${currentPage}...` : `Fetching collection page ${currentPage}...`
                );

                // Use collektClient
                const response = await collektClient.getTokenCollection({
                    address,
                    page: currentPage,
                    pageSize: NFTS_PER_ROOM,
                    forceRefresh: false,
                });

                if (!response.success || !response.data) {
                    throw new Error(response.error || "Failed to fetch collection");
                }

                const { data: result } = response;

                // Update total count from API response
                setTotalNFTs(result.pagination.totalItems);

                // If we're on an invalid page, redirect appropriately
                if (currentPage > result.pagination.totalPages && result.pagination.totalItems > 0) {
                    router.push(`/gallery/${address}`); // Go back to page 1
                    return;
                }

                // Process NFTs based on page type
                const processedNFTs = isBasePage
                    ? result.tokens.filter((token: any) => {
                          const hasMetadata = token.metadata;
                          const hasBalance = token.balance > 0;
                          return hasMetadata && hasBalance;
                      })
                    : result.tokens.map((token) => token); // Use UnifiedToken directly

                setNfts(processedNFTs);

                // Preload textures for this room
                await preloadTextures(processedNFTs, 0, result.pagination.totalItems);
            } catch (err) {
                console.error("Error fetching NFTs:", err);
                setError("Failed to load your NFT collection. Please check the address and try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchNFTsForPage();
    }, [address, currentPage, isBasePage]);

    const preloadTextures = async (nftList: UnifiedToken[], targetRoom: number = 0, totalNFTCount?: number) => {
        setLoadingProgress("Preloading images...");
        const textureMap = new Map<string, THREE.Texture>();

        // Just preload the current page's NFTs
        const nftsToPreload = nftList;

        const promises = nftsToPreload.map(async (nft, index) => {
            try {
                setLoadingProgress(`Loading image ${index + 1} of ${nftsToPreload.length}...`);

                const texture = await loadTextureWithFallback(nft);
                if (texture) {
                    textureMap.set(nft.id, texture);
                }
            } catch (err) {
                // Skip error logging for cleaner console
            }
        });

        await Promise.all(promises);
        setPreloadedTextures(textureMap);
        setLoadingProgress("Rendering 3D gallery...");
        setLoading(false);
    };

    const loadTextureWithFallback = async (nft: UnifiedToken): Promise<THREE.Texture | null> => {
        const metadata = nft.metadata;
        if (!metadata) return null;

        // Get all possible URIs in priority order - comprehensive version from base page
        const possibleUris = [
            { uri: (nft as any).displayImage, source: "displayImage" },
            { uri: metadata.displayUri, source: "displayUri" },
            { uri: metadata.image, source: "image" },
            { uri: metadata.thumbnailUri, source: "thumbnailUri" },
            { uri: metadata.artifactUri, source: "artifactUri" },
            // Additional fallbacks for different standards
            { uri: (metadata as any).imageUri, source: "imageUri" },
            { uri: (metadata as any).media?.[0]?.uri, source: "media[0].uri" },
            { uri: (metadata as any).assets?.[0]?.uri, source: "assets[0].uri" },
        ].filter((item) => item.uri && typeof item.uri === "string");

        // Try each URI until one works
        for (const { uri } of possibleUris) {
            try {
                let mediaUrl = uri;
                if (uri.startsWith("ipfs://")) {
                    // Extract CID and preserve any query parameters
                    const withoutProtocol = uri.replace("ipfs://", "");
                    mediaUrl = `https://ipfs.fileship.xyz/${withoutProtocol}`;
                }

                const texture = await loadTexture(mediaUrl);
                return texture;
            } catch (err) {
                // Continue to next URI
            }
        }

        return null;
    };

    const loadTexture = (url: string): Promise<THREE.Texture> => {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin("anonymous");

            loader.load(
                url,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    texture.flipY = false;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    texture.needsUpdate = true;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    };

    // Helper function to detect if URI is likely an image
    const isImageUri = (uri: string): boolean => {
        if (!uri) return false;

        // Check file extension
        const lowerUri = uri.toLowerCase();
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
        const hasImageExtension = imageExtensions.some((ext) => lowerUri.includes(ext));

        // Check for HTML indicators
        const htmlIndicators = [".html", "text/html", "<html", "<!doctype"];
        const isHtml = htmlIndicators.some((indicator) => lowerUri.includes(indicator));

        return hasImageExtension && !isHtml;
    };

    const getImageUri = (nft: UnifiedToken) => {
        const metadata = nft.metadata;
        if (!metadata) return null;

        // All possible URIs with their sources - comprehensive version
        const possibleUris = [
            { uri: (nft as any).displayImage, source: "displayImage" },
            { uri: metadata.displayUri, source: "displayUri" },
            { uri: metadata.image, source: "image" },
            { uri: metadata.thumbnailUri, source: "thumbnailUri" },
            { uri: metadata.artifactUri, source: "artifactUri" },
        ].filter((item) => item.uri && typeof item.uri === "string");

        // First, try to find URIs that are likely images
        const imageUris = possibleUris.filter((item) => item.uri && isImageUri(item.uri));

        if (imageUris.length > 0) {
            return imageUris[0].uri;
        }

        // If no obvious image URIs, fall back to first available URI
        const foundUri = possibleUris[0]?.uri;

        return foundUri || null;
    };

    const getHeaderInfoText = () => {
        if (totalNFTs > 0) {
            return isBasePage
                ? `${nfts.length} of ${totalNFTs} NFTs loaded`
                : `Page ${currentPage} • ${nfts.length} of ${totalNFTs} NFTs`;
        }
        return `${nfts.length} NFTs found`;
    };

    const getEmptyStateMessage = () => {
        return isBasePage
            ? {
                  title: "No NFTs in collection",
                  subtitle: "This address doesn't own any NFTs with metadata",
              }
            : {
                  title: "No NFTs on this page",
                  subtitle: `Page ${currentPage} is beyond your collection`,
              };
    };

    const getEmptyStateButtonText = () => {
        return isBasePage ? "Back to Home" : "Back to Page 1";
    };

    const handleEmptyStateClick = () => {
        if (isBasePage) {
            router.push("/");
        } else {
            router.push(`/gallery/${address}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="space-y-4 text-center">
                    <Loader2 className="w-12 h-12 mx-auto text-cyan-400 animate-spin" />
                    <p className="text-xl text-white">{loadingProgress}</p>
                    <p className="text-white/60">Loading your collection from {address}</p>
                    {!isBasePage && <p className="text-sm text-cyan-400">Page {currentPage}</p>}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-black">
                <div className="max-w-md space-y-4 text-center">
                    <p className="text-xl text-red-400">{error}</p>
                    <Button onClick={() => router.push("/")} className="bg-cyan-500 hover:bg-cyan-600">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Button>
                </div>
            </div>
        );
    }

    if (nfts.length === 0 && !loading) {
        const emptyState = getEmptyStateMessage();
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-black">
                <div className="max-w-md space-y-4 text-center">
                    <p className="text-xl text-white">{emptyState.title}</p>
                    <p className="text-white/60">{emptyState.subtitle}</p>
                    <Button onClick={handleEmptyStateClick} className="bg-cyan-500 hover:bg-cyan-600">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {getEmptyStateButtonText()}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black">
            {/* Header */}
            <div className="absolute z-50 top-4 left-4">
                <Button
                    onClick={() => router.push("/")}
                    variant="outline"
                    className="text-white bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-sm"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>

            <div className="absolute z-50 top-4 right-4">
                <div className="flex items-center gap-2">
                    <div className="px-4 py-2 text-sm text-white rounded-lg bg-black/50 backdrop-blur-sm">
                        {getHeaderInfoText()}
                    </div>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        className="text-white bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-sm"
                        disabled={loading}
                        title="Refresh collection and rebuild cache"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    {galleryError && (
                        <Button
                            onClick={() => setUse3D(!use3D)}
                            variant="outline"
                            className="text-white bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-sm"
                        >
                            {use3D ? "Switch to 2D" : "Try 3D"}
                        </Button>
                    )}
                </div>
            </div>

            {/* 3D Gallery with Error Boundary */}
            {use3D ? (
                <ErrorBoundary
                    fallback={
                        <div className="flex items-center justify-center min-h-screen bg-black">
                            <div className="space-y-4 text-center">
                                <p className="text-xl text-red-400">Failed to load 3D gallery</p>
                                <p className="text-white/60">
                                    {galleryError || "Cannot read properties of undefined (reading 'S')"}
                                </p>
                                <p className="text-white/60">Showing 2D gallery instead:</p>
                                <Button onClick={() => setUse3D(false)} className="bg-cyan-500 hover:bg-cyan-600">
                                    Switch to 2D Gallery
                                </Button>
                            </div>
                        </div>
                    }
                    onError={(error) => {
                        console.error("3D Gallery Error:", error);
                        setGalleryError(error.message);
                        setUse3D(false);
                    }}
                >
                    <Gallery3D
                        nfts={nfts}
                        address={address}
                        domain={domain}
                        displayName={displayName}
                        onNFTSelect={setSelectedNFT}
                        preloadedTextures={preloadedTextures}
                        currentRoom={currentRoom}
                        onRoomChange={updateRoomInUrl}
                        totalNFTs={totalNFTs}
                        topOffset={64} // 64px to avoid overlapping with Back button
                        initialCameraMode={cameraMode}
                        onCameraModeChange={setCameraMode}
                    />
                </ErrorBoundary>
            ) : (
                <Simple2DGallery nfts={nfts} onNFTSelect={setSelectedNFT} getImageUri={getImageUri} />
            )}

            {/* Metadata Panel */}
            <MediaModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} />
        </div>
    );
}
