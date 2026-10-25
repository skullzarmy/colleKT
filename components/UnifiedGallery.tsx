"use client";

import { useEffect, useState, Component } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useViewState } from "@/contexts/ViewStateContext";
import { useTezosDomain } from "@/hooks/use-tezos-domain";
import { useGalleryMetadata } from "@/hooks/use-gallery-metadata";
import { collektClient } from "@/lib/data/sources/collekt-client";
import { UnifiedToken } from "@/lib/data/types/token-types";
import * as THREE from "three";
import LoadingAnimation from "./LoadingAnimation";

// Dynamically import Gallery3D with no SSR to prevent hydration issues
const Gallery3D = dynamic(() => import("@/components/Gallery3D"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <LoadingAnimation />
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

// Simple 2D Gallery Fallback with full WCAG 2.2 AA accessibility
function Simple2DGallery({
    nfts,
    onNFTSelect,
    getImageUri,
    onSwitchTo3D,
}: {
    nfts: UnifiedToken[];
    onNFTSelect: (nft: UnifiedToken) => void;
    getImageUri: (nft: UnifiedToken) => string | null;
    onSwitchTo3D?: () => void;
}) {
    const getIPFSUrl = (uri: string) => {
        if (uri.startsWith("ipfs://")) {
            const withoutProtocol = uri.replace("ipfs://", "");
            return `https://ipfs.fileship.xyz/${withoutProtocol}`;
        }
        return uri;
    };

    return (
        <div className="min-h-screen p-6 sm:p-8 bg-black text-white pt-20">
            {onSwitchTo3D && (
                <div className="max-w-7xl mx-auto mb-6 flex items-center justify-between p-3.5 bg-zinc-900/80 border border-zinc-700 rounded-xl">
                    <span className="text-xs text-zinc-300">2D Grid View Active</span>
                    <Button
                        onClick={onSwitchTo3D}
                        size="sm"
                        className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs min-h-[36px]"
                    >
                        Switch to 3D Gallery
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-w-7xl mx-auto">
                {nfts.map((nft) => {
                    const imageUri = getImageUri(nft);
                    const title = nft.metadata?.name || `Token #${nft.tokenId}`;
                    return (
                        <div
                            key={nft.id}
                            tabIndex={0}
                            role="button"
                            aria-label={`View details for ${title}`}
                            className="overflow-hidden transition-all bg-zinc-900/90 border-2 border-zinc-700/80 rounded-xl cursor-pointer hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none group shadow-md"
                            onClick={() => onNFTSelect(nft)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNFTSelect(nft);
                                }
                            }}
                        >
                            <div className="flex items-center justify-center bg-zinc-950 aspect-square overflow-hidden relative">
                                {imageUri ? (
                                    <img
                                        src={getIPFSUrl(imageUri)}
                                        alt={title}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            target.parentElement!.innerHTML =
                                                '<div class="text-zinc-300 text-center text-xs p-2">Image Preview Unavailable</div>';
                                        }}
                                    />
                                ) : (
                                    <div className="text-center text-zinc-300 text-xs">
                                        🖼<br />No Preview
                                    </div>
                                )}
                            </div>
                            <div className="p-3.5 space-y-1">
                                <h3 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                    {title}
                                </h3>
                                <p className="font-mono text-xs text-zinc-300 truncate">
                                    {nft.contractAddress.slice(0, 8)}...#{nft.tokenId}
                                </p>
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
    const pathname = usePathname();
    const { domain, isLoading: domainLoading, displayName } = useTezosDomain(address);
    const galleryMetadata = useGalleryMetadata(address, domain, displayName);
    const [nfts, setNfts] = useState<UnifiedToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<UnifiedToken | null>(null);
    const [use3D, setUse3D] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<string>("Fetching NFTs...");
    const [preloadedTextures, setPreloadedTextures] = useState<Map<string, THREE.Texture>>(new Map());
    const [totalNFTs, setTotalNFTs] = useState<number>(0);

    // Use shared view state instead of local state
    const { cameraMode, setCameraMode } = useViewState();

    // Check for embed mode in URL params
    const isEmbed = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true";

    // Detect gallery type from current pathname
    const getGalleryType = (): "USER" | "CURATION" | "COLLECTION" => {
        if (pathname.startsWith("/curation/")) {
            return "CURATION";
        } else if (pathname.startsWith("/collection/")) {
            return "COLLECTION";
        } else {
            return "USER";
        }
    };

    const galleryType = getGalleryType();

    // Convert page number to room number (0-based)
    const currentRoom = currentPage - 1;

    // Check for keyboard availability on mount
    useEffect(() => {
        const checkKeyboardAvailability = () => {
            // Multiple ways to detect if a physical keyboard is available:
            // 1. Navigator Keyboard API (experimental)
            // 2. Check if primary input is touch vs pointer
            // 3. Check for touch capability
            const nav = navigator as any;
            const hasKeyboardAPI = nav.keyboard;
            const hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
            const hasNoTouch = !("ontouchstart" in window);

            // Assume keyboard is available if:
            // - Keyboard API exists, OR
            // - Device has fine pointer control (mouse/trackpad), OR
            // - Device doesn't support touch
            const hasKeyboard = hasKeyboardAPI || hasFinePointer || hasNoTouch;

            setIsMobile(!hasKeyboard);
        };

        checkKeyboardAvailability();

        // Listen for media query changes (pointer type changes)
        if (window.matchMedia) {
            const pointerQuery = window.matchMedia("(pointer: fine)");
            const handlePointerChange = () => checkKeyboardAvailability();

            // Modern browsers
            if (pointerQuery.addEventListener) {
                pointerQuery.addEventListener("change", handlePointerChange);
                return () => pointerQuery.removeEventListener("change", handlePointerChange);
            }
            // Fallback for older browsers
            else if (pointerQuery.addListener) {
                pointerQuery.addListener(handlePointerChange);
                return () => pointerQuery.removeListener(handlePointerChange);
            }
        }
    }, []);

    // Update page title when metadata loads (only if enabled)
    useEffect(() => {
        if (enableDocumentTitle && !galleryMetadata.isLoading) {
            let title = "ColleKT - NFT Gallery";

            switch (galleryMetadata.type) {
                case "USER":
                    title = `${galleryMetadata.name}'s ColleKT - NFT Gallery`;
                    break;
                case "CURATION":
                    title = `${galleryMetadata.name} - Curated Collection`;
                    break;
                case "COLLECTION":
                    title = `${galleryMetadata.name} - NFT Collection`;
                    break;
            }

            document.title = title;
        }
    }, [galleryMetadata, enableDocumentTitle]);

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

            // Call appropriate client method based on gallery type
            let response;
            switch (galleryType) {
                case "CURATION":
                    response = await collektClient.getCurationCollection({
                        curationId: address,
                        page: currentPage,
                        pageSize: NFTS_PER_ROOM,
                        forceRefresh: true,
                    });
                    break;
                case "COLLECTION":
                    response = await collektClient.getContractCollection({
                        contractAddress: address,
                        page: currentPage,
                        pageSize: NFTS_PER_ROOM,
                        forceRefresh: true,
                    });
                    break;
                default: // USER
                    response = await collektClient.getTokenCollection({
                        address,
                        page: currentPage,
                        pageSize: NFTS_PER_ROOM,
                        forceRefresh: true, // This will force a fresh fetch and rebuild cache
                    });
                    break;
            }

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

        // Generate route based on gallery type
        let baseRoute: string;
        switch (galleryType) {
            case "CURATION":
                baseRoute = `/curation/${address}`;
                break;
            case "COLLECTION":
                baseRoute = `/collection/${address}`;
                break;
            default: // USER
                baseRoute = `/gallery/${address}`;
                break;
        }

        if (newPage === 1) {
            // Going to page 1, use base route
            router.push(baseRoute);
        } else {
            // Going to specific page, use dynamic route
            router.push(`${baseRoute}/page/${newPage}`);
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

                // Call appropriate client method based on gallery type
                let response;
                switch (galleryType) {
                    case "CURATION":
                        response = await collektClient.getCurationCollection({
                            curationId: address,
                            page: currentPage,
                            pageSize: NFTS_PER_ROOM,
                            forceRefresh: false,
                        });
                        break;
                    case "COLLECTION":
                        response = await collektClient.getContractCollection({
                            contractAddress: address,
                            page: currentPage,
                            pageSize: NFTS_PER_ROOM,
                            forceRefresh: false,
                        });
                        break;
                    default: // USER
                        response = await collektClient.getTokenCollection({
                            address,
                            page: currentPage,
                            pageSize: NFTS_PER_ROOM,
                            forceRefresh: false,
                        });
                        break;
                }

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

                // Check for ?token= URL parameter to autofocus or open that piece
                if (typeof window !== "undefined") {
                    try {
                        const tokenParam = new URLSearchParams(window.location.search).get("token");
                        if (tokenParam) {
                            const target = processedNFTs.find((t: any) => String(t.tokenId) === String(tokenParam));
                            if (target) {
                                setSelectedNFT(target);
                            }
                        }
                    } catch {
                        /* ignore param error */
                    }
                }

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
    }, [address, currentPage, isBasePage, galleryType]);

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
                    const withoutProtocol = uri.replace("ipfs://", "").replace(/^([a-zA-Z0-9]+)\?/, "$1/?");
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
            // Go back to page 1 of the current gallery type
            switch (galleryType) {
                case "CURATION":
                    router.push(`/curation/${address}`);
                    break;
                case "COLLECTION":
                    router.push(`/collection/${address}`);
                    break;
                default: // USER
                    router.push(`/gallery/${address}`);
                    break;
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <LoadingAnimation />
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
            {/* Header (hidden in embed mode) */}
            {!isEmbed && (
                <>
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
                            {!isMobile && (
                                <Button
                                    onClick={() => {
                                        setGalleryError(null);
                                        setUse3D(!use3D);
                                    }}
                                    variant="outline"
                                    className="text-white bg-black/50 border-white/20 hover:bg-black/70 backdrop-blur-sm"
                                >
                                    {use3D ? "Switch to 2D" : "Switch to 3D"}
                                </Button>
                            )}
                            {isMobile && (
                                <div className="px-3 py-1 text-xs text-white/70 rounded bg-black/50 backdrop-blur-sm">
                                    Mobile 2D Mode
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* 3D Gallery with Error Boundary - Desktop only */}
            {use3D && !isMobile ? (
                <ErrorBoundary
                    fallback={
                        <div className="flex items-center justify-center min-h-screen bg-black">
                            <div className="space-y-4 text-center max-w-md p-6">
                                <p className="text-xl font-bold text-amber-400">Failed to load 3D gallery</p>
                                <p className="text-sm text-zinc-200">
                                    {galleryError || "WebGL context could not be created."}
                                </p>
                                <Button
                                    onClick={() => setUse3D(false)}
                                    className="bg-white text-zinc-950 font-bold hover:bg-zinc-200 min-h-[44px]"
                                >
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
                    />
                </ErrorBoundary>
            ) : (
                <Simple2DGallery
                    nfts={nfts}
                    onNFTSelect={setSelectedNFT}
                    getImageUri={getImageUri}
                    onSwitchTo3D={() => {
                        setGalleryError(null);
                        setUse3D(true);
                    }}
                />
            )}

            {/* Metadata Panel */}
            <MediaModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} />
        </div>
    );
}
