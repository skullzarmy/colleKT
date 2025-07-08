"use client";

import { useEffect, useState, Component } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MediaModal from "@/components/media-modal";
import { useViewState } from "@/contexts/ViewStateContext";
import { useTezosDomain } from "@/hooks/use-tezos-domain";
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

interface NFTToken {
    id: string;
    token_id: string;
    balance?: number;
    contract: {
        address: string;
        alias?: string;
    };
    metadata?: {
        name?: string;
        description?: string;
        image?: string;
        artifact_uri?: string;
        display_uri?: string;
        thumbnail_uri?: string;
        formats?: Array<{
            uri: string;
            mimeType: string;
        }>;
        attributes?: Array<{
            name: string;
            value: string;
        }>;
    };
}

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
function Simple2DGallery({ nfts, onNFTSelect }: { nfts: NFTToken[]; onNFTSelect: (nft: NFTToken) => void }) {
    const getImageUri = (nft: NFTToken) => {
        const metadata = nft.metadata;
        if (!metadata) return null;
        return (
            metadata.display_uri ||
            metadata.image ||
            metadata.artifact_uri ||
            metadata.thumbnail_uri ||
            metadata.formats?.[0]?.uri
        );
    };

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
                                        alt={nft.metadata?.name || `Token #${nft.token_id}`}
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
                                    {nft.metadata?.name || `Token #${nft.token_id}`}
                                </h3>
                                <p className="mt-1 text-xs text-gray-400">
                                    {nft.contract.alias || `${nft.contract.address.slice(0, 8)}...`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function GalleryPageWithNumber() {
    const params = useParams();
    const router = useRouter();
    const address = params.address as string;
    const pagenum = params.pagenum as string;

    console.log("📄 ROOM PAGE COMPONENT RENDER:", {
        address,
        pagenum,
        addressType: typeof address,
        addressLength: address?.length,
        params,
        timestamp: new Date().toISOString(),
    });

    const { domain, isLoading: domainLoading, displayName } = useTezosDomain(address);

    console.log("🏠 ROOM PAGE DOMAIN HOOK RESULT:", {
        domain,
        domainLoading,
        displayName,
        address,
        timestamp: new Date().toISOString(),
    });

    const [nfts, setNfts] = useState<NFTToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNFT, setSelectedNFT] = useState<NFTToken | null>(null);
    const [use3D, setUse3D] = useState(true);
    const [galleryError, setGalleryError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState<string>("Fetching NFTs...");
    const [preloadedTextures, setPreloadedTextures] = useState<Map<string, THREE.Texture>>(new Map());
    const [totalNFTs, setTotalNFTs] = useState<number>(0);

    // Use shared view state instead of local state
    const { cameraMode, setCameraMode } = useViewState();

    // Parse and validate page number
    const currentRoom = (() => {
        const pageNumber = parseInt(pagenum);
        if (isNaN(pageNumber) || pageNumber <= 0) {
            // Invalid page number, redirect to page 1
            router.replace(`/gallery/${address}`);
            return 0;
        }
        return pageNumber - 1; // Convert to 0-based
    })();

    // Update URL when room changes - navigate to appropriate route
    const updateRoomInUrl = (roomNumber: number) => {
        if (roomNumber === 0) {
            // Going to page 1, use base route
            router.push(`/gallery/${address}`);
        } else {
            // Going to specific page, use dynamic route
            router.push(`/gallery/${address}/page/${roomNumber + 1}`);
        }
    };

    // Preload more textures when room changes
    useEffect(() => {
        if (nfts.length > 0 && !loading) {
            const preloadForRoom = async () => {
                await preloadTextures(nfts, 0, totalNFTs); // Always preload from index 0 since we only have one room's worth
            };
            preloadForRoom();
        }
    }, [nfts.length, loading, totalNFTs]);

    useEffect(() => {
        if (!address) return;

        const fetchNFTsForPage = async () => {
            try {
                setLoading(true);
                setError(null);

                const NFTS_PER_ROOM = 20;
                const roomNumber = currentRoom; // 0-based
                const offset = roomNumber * NFTS_PER_ROOM;

                setLoadingProgress(`Fetching total collection count...`);

                // Get total count using the dedicated count endpoint
                const countResponse = await fetch(
                    `https://api.tzkt.io/v1/tokens/balances/count?account=${address}&balance.gt=0&token.metadata.ne=null`
                );

                if (!countResponse.ok) {
                    throw new Error(`Failed to fetch total count: ${countResponse.status} ${countResponse.statusText}`);
                }

                const totalCount = await countResponse.json();
                setTotalNFTs(totalCount);

                setLoadingProgress(`Fetching page ${roomNumber + 1}...`);

                // Then fetch NFTs for this specific page
                const response = await fetch(
                    `https://api.tzkt.io/v1/tokens/balances?account=${address}&balance.gt=0&token.metadata.ne=null&select=balance,token&limit=${NFTS_PER_ROOM}&offset=${offset}`
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch NFTs: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // If we're on an invalid page, redirect to page 1
                if (offset >= totalCount && totalCount > 0) {
                    router.replace(`/gallery/${address}`);
                    return;
                }

                // Process NFTs
                const processedNFTs = data
                    .filter((item: any) => {
                        const hasMetadata = item.token?.metadata;
                        const hasBalance = item.balance > 0;
                        return hasMetadata && hasBalance;
                    })
                    .map((item: any) => {
                        const nft = {
                            id: `${item.token.contract.address}_${item.token.tokenId}`,
                            token_id: item.token.tokenId,
                            balance: item.balance,
                            contract: {
                                address: item.token.contract.address,
                                alias: item.token.contract.alias,
                            },
                            metadata: item.token.metadata,
                        };

                        // Log metadata for fxhash contracts or problematic ones
                        // Skip debug logging for now

                        return nft;
                    });

                setNfts(processedNFTs);

                // Preload textures for this room
                await preloadTextures(processedNFTs, 0, totalCount); // Pass totalCount to preloadTextures
            } catch (err) {
                console.error("Error fetching NFTs:", err);
                setError("Failed to load your NFT collection. Please check the address and try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchNFTsForPage();
    }, [address, currentRoom]);

    const preloadTextures = async (nftList: NFTToken[], targetRoom: number = 0, totalNFTCount?: number) => {
        setLoadingProgress("Preloading images...");
        const textureMap = new Map<string, THREE.Texture>();

        // Just preload the current page's NFTs
        const nftsToPreload = nftList;

        const promises = nftsToPreload.map(async (nft, index) => {
            const imageUri = getImageUri(nft);
            if (!imageUri) return;

            try {
                setLoadingProgress(`Loading image ${index + 1} of ${nftsToPreload.length}...`);

                let mediaUrl = imageUri;
                if (imageUri.startsWith("ipfs://")) {
                    // Extract CID and preserve any query parameters
                    const withoutProtocol = imageUri.replace("ipfs://", "");
                    mediaUrl = `https://ipfs.fileship.xyz/${withoutProtocol}`;
                }

                const texture = await loadTexture(mediaUrl);
                textureMap.set(nft.id, texture);
            } catch (err) {
                // Failed to preload texture - continue silently
            }
        });

        await Promise.all(promises);
        setPreloadedTextures(textureMap);
        setLoadingProgress("Rendering 3D gallery...");
        setLoading(false);
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

    const getImageUri = (nft: NFTToken) => {
        const metadata = nft.metadata;
        if (!metadata) return null;

        // Enhanced image URI extraction with more fallbacks
        const possibleUris = [
            metadata.display_uri,
            metadata.image,
            metadata.artifact_uri,
            metadata.thumbnail_uri,
            metadata.formats?.[0]?.uri,
            // Additional fallbacks for different standards
            (metadata as any).displayUri,
            (metadata as any).artifactUri,
            (metadata as any).thumbnailUri,
            (metadata as any).imageUri,
            (metadata as any).media?.[0]?.uri,
            (metadata as any).assets?.[0]?.uri,
        ];

        const foundUri = possibleUris.find((uri) => uri && typeof uri === "string");

        // Log for debugging fxhash tokens
        return foundUri || null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="space-y-4 text-center">
                    <Loader2 className="w-12 h-12 mx-auto text-cyan-400 animate-spin" />
                    <p className="text-xl text-white">{loadingProgress}</p>
                    <p className="text-white/60">Loading your collection from {address}</p>
                    <p className="text-sm text-cyan-400">Page {currentRoom + 1}</p>
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
        // Only show "no NFTs" if we're not loading and truly have no NFTs
        return (
            <div className="flex items-center justify-center min-h-screen p-4 bg-black">
                <div className="max-w-md space-y-4 text-center">
                    <p className="text-xl text-white">No NFTs on this page</p>
                    <p className="text-white/60">Page {currentRoom + 1} is beyond your collection</p>
                    <Button
                        onClick={() => router.push(`/gallery/${address}`)}
                        className="bg-cyan-500 hover:bg-cyan-600"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Page 1
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
                        {totalNFTs > 0
                            ? `Page ${currentRoom + 1} • ${nfts.length} of ${totalNFTs} NFTs`
                            : `${nfts.length} NFTs found`}
                    </div>
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
                        onNFTSelect={setSelectedNFT}
                        preloadedTextures={preloadedTextures}
                        currentRoom={currentRoom}
                        onRoomChange={updateRoomInUrl}
                        totalNFTs={totalNFTs}
                        domain={domain}
                        displayName={displayName}
                        topOffset={64} // 64px to avoid overlapping with Back button (top-4 = 16px + button height ~48px)
                        initialCameraMode={cameraMode}
                        onCameraModeChange={setCameraMode}
                    />
                </ErrorBoundary>
            ) : (
                <Simple2DGallery nfts={nfts} onNFTSelect={setSelectedNFT} />
            )}

            {/* Metadata Panel */}
            <MediaModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} />
        </div>
    );
}
