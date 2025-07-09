"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Maximize2,
    Minimize2,
    Info,
    Download,
    ExternalLink,
    Play,
    Pause,
    Volume2,
    VolumeX,
    RotateCcw,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { UnifiedToken } from "@/lib/data/types/token-types";

interface MediaModalProps {
    nft: UnifiedToken | null;
    onClose?: () => void;
}

export default function MediaModal({ nft, onClose }: MediaModalProps) {
    const [showMetadata, setShowMetadata] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [detectedMediaType, setDetectedMediaType] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);
    // Contract alias now comes directly from nft.contractAlias - no need for separate state/fetch
    const [artistAliases, setArtistAliases] = useState<{ [address: string]: string | null }>({});
    const [isLoadingArtistAliases, setIsLoadingArtistAliases] = useState(false);
    // Removed collectionInfo state - we get alias directly from nft.contractAlias now
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const currentNftIdRef = useRef<string | null>(null);

    // Reset states when NFT changes using useLayoutEffect for synchronous execution
    useLayoutEffect(() => {
        if (nft?.id !== currentNftIdRef.current) {
            currentNftIdRef.current = nft?.id || null;
            setShowMetadata(false);
            setIsFullscreen(false);
            setIsPlaying(false);
            setIsMuted(false);
            setZoom(1);
            setDetectedMediaType(null);
            setIsDetecting(false);
            // Contract alias now comes directly from nft.contractAlias - no reset needed
            setArtistAliases({});
            setIsLoadingArtistAliases(false);
        }
    }, [nft?.id]);

    // Fetch artist alias from TzKT accounts endpoint
    const fetchArtistAlias = async (artistAddress: string): Promise<string | null> => {
        try {
            const response = await fetch(`https://api.tzkt.io/v1/accounts/${artistAddress}`);
            if (!response.ok) {
                console.error(`❌ Artist API failed with status ${response.status}: ${response.statusText}`);
                return null;
            }

            const account = await response.json();

            const alias = account.alias || null;
            return alias;
        } catch (error) {
            console.error("❌ Failed to fetch artist alias:", error);
            console.error("❌ Artist address was:", artistAddress);
            return null;
        }
    };

    // Fetch collection information using DIRECT API - FUCK THE SDK
    const fetchCollectionInfo = async (
        contractAddress: string
    ): Promise<{
        name?: string;
        alias?: string;
        creator?: { alias?: string; address?: string };
        kind?: string;
        tzips?: string[];
    } | null> => {
        try {
            const response = await fetch(`https://api.tzkt.io/v1/contracts/${contractAddress}`);

            if (!response.ok) {
                console.error(`❌ DIRECT API failed with status ${response.status}: ${response.statusText}`);
                return null;
            }

            const contract = await response.json();

            const result = {
                name: contract.metadata?.name || undefined,
                alias: contract.alias || undefined,
                creator: contract.creator || undefined,
                kind: contract.kind || undefined,
                tzips: contract.tzips || undefined,
            };

            return result;
        } catch (error) {
            console.error("❌ Failed to fetch collection info via DIRECT API:", error);
            console.error("❌ Contract address was:", contractAddress);
            return null;
        }
    };

    // Effect to fetch artist aliases when NFT changes
    useEffect(() => {
        if (nft?.metadata?.creators && nft.metadata.creators.length > 0) {
            setIsLoadingArtistAliases(true);

            // Fetch aliases for all creators
            Promise.all(
                nft.metadata.creators.map(async (creatorAddress) => {
                    if (artistAliases[creatorAddress] !== undefined) {
                        return [creatorAddress, artistAliases[creatorAddress]];
                    }
                    const alias = await fetchArtistAlias(creatorAddress);
                    return [creatorAddress, alias];
                })
            )
                .then((results) => {
                    const newAliases = Object.fromEntries(results);
                    setArtistAliases(newAliases);
                    setIsLoadingArtistAliases(false);
                })
                .catch(() => {
                    setIsLoadingArtistAliases(false);
                });
        }
    }, [nft?.metadata?.creators]);

    // Actually detect the media type by fetching headers
    const detectActualMediaType = async (uri: string): Promise<string> => {
        try {
            // Handle base64 data URIs
            if (uri.startsWith("data:")) {
                const mimeType = uri.split(";")[0].split(":")[1];
                if (mimeType.startsWith("image/")) return "image";
                if (mimeType.startsWith("video/")) return "video";
                if (mimeType.startsWith("audio/")) return "audio";
                if (mimeType.includes("text/html")) return "html";
                return "image"; // Default for data URIs
            }

            const response = await fetch(uri, { method: "HEAD" });
            const contentType = response.headers.get("content-type") || "";

            if (contentType.startsWith("image/")) return "image";
            if (contentType.startsWith("video/")) return "video";
            if (contentType.startsWith("audio/")) return "audio";
            if (contentType.includes("text/html") || contentType.includes("application/html")) return "html";
            if (contentType.includes("model/") || contentType.includes("application/octet-stream")) return "3d";

            // If content-type is not helpful, try fetching a small portion to detect
            const partialResponse = await fetch(uri, {
                headers: { Range: "bytes=0-1023" },
            });
            const text = await partialResponse.text();

            if (text.includes("<!DOCTYPE html") || text.includes("<html")) return "html";
            if (text.includes("fxhash")) return "html"; // fxhash content is usually HTML

            // Default fallback
            return "image";
        } catch (error) {
            return "image";
        }
    };

    // Effect to stop media when NFT changes
    useEffect(() => {
        // Stop any playing media when NFT changes
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [nft?.id]);

    // Effect to detect media type
    useEffect(() => {
        if (!nft) return; // Guard clause inside the effect

        const rawUri = nft.metadata?.artifactUri || nft.metadata?.displayUri || nft.metadata?.image;

        if (rawUri && !isDetecting && !detectedMediaType) {
            setIsDetecting(true);
            setDetectedMediaType(null);

            const testUri = rawUri.startsWith("ipfs://")
                ? `https://ipfs.fileship.xyz/${rawUri.replace("ipfs://", "")}`
                : rawUri;

            detectActualMediaType(testUri)
                .then((type) => {
                    setDetectedMediaType(type);
                    setIsDetecting(false);
                })
                .catch((error) => {
                    setIsDetecting(false);
                });
        }
    }, [nft?.id, isDetecting, detectedMediaType]);

    if (!nft) return null; // Collection name with direct API alias - no fetching needed!
    const getCollectionDisplayName = () => {
        // Primary: use the contract alias from the main API fetch (now correct!)
        if (nft.contractAlias) return nft.contractAlias;

        // Final fallback to truncated address
        return `${nft.contractAddress.slice(0, 8)}...${nft.contractAddress.slice(-4)}`;
    };

    const getIPFSUrl = (uri: string, preferStandardGateway = false) => {
        // Don't modify base64 data URIs
        if (uri.startsWith("data:")) {
            return uri;
        }

        if (uri.startsWith("ipfs://")) {
            // Preserve everything after ipfs:// including query parameters
            const withoutProtocol = uri.replace("ipfs://", "");

            // Use ipfs.io for HTML content or when explicitly requested
            if (preferStandardGateway) {
                return `https://ipfs.io/ipfs/${withoutProtocol}`;
            }

            return `https://ipfs.fileship.xyz/${withoutProtocol}`;
        }
        return uri;
    };
    const getRawMediaUri = () => {
        // Get raw URI without gateway conversion first
        // Handle UnifiedToken camelCase property names
        const artifact = nft.metadata?.artifactUri;
        const display = nft.metadata?.displayUri;
        const image = nft.metadata?.image;

        if (artifact) return artifact;
        if (display) return display;
        if (image) return image;
        return null;
    };

    const getBestMediaUri = () => {
        const rawUri = getRawMediaUri();
        if (!rawUri) return null;

        // Use detected type if available, fallback to pattern matching
        const mediaType = detectedMediaType || getMediaType();
        const isHtml = mediaType === "html";
        const finalUri = getIPFSUrl(rawUri, isHtml);

        return finalUri;
    };

    const isHtmlContent = (uri: string, mimeType?: string) => {
        const lowerUri = uri.toLowerCase();
        const lowerMime = mimeType?.toLowerCase() || "";

        // Check MIME type first
        if (lowerMime.includes("text/html") || lowerMime.includes("application/html")) {
            return true;
        }

        // Check for fxhash parameter (indicates interactive generative art)
        if (lowerUri.includes("?fxhash=") || lowerUri.includes("&fxhash=")) {
            return true;
        }

        // Check URI patterns for HTML
        if (lowerUri.includes(".html") || lowerUri.includes(".htm")) {
            return true;
        }

        if (lowerUri.includes("fxhash.xyz") || lowerUri.includes("gateway.fxhash")) {
            return true;
        }

        // Check for HTML content indicators
        if (lowerUri.includes("text/html") || lowerUri.includes("html")) {
            return true;
        }

        return false;
    };
    const getMediaType = () => {
        const rawUri = getRawMediaUri() || "";

        // Handle base64 data URIs first
        if (rawUri.startsWith("data:")) {
            const mimeType = rawUri.split(";")[0].split(":")[1].toLowerCase();
            if (mimeType.startsWith("video/")) return "video";
            if (mimeType.startsWith("audio/")) return "audio";
            if (mimeType.startsWith("image/")) return "image";
            if (mimeType.includes("text/html")) return "html";
            return "image"; // Default for data URIs
        }

        // Fallback detection based on URI
        const lowerUri = rawUri.toLowerCase();
        if (lowerUri.includes(".mp4") || lowerUri.includes(".webm") || lowerUri.includes(".mov")) {
            return "video";
        }
        if (lowerUri.includes(".mp3") || lowerUri.includes(".wav") || lowerUri.includes(".ogg")) {
            return "audio";
        }
        if (isHtmlContent(lowerUri)) {
            return "html";
        }
        if (lowerUri.includes(".glb") || lowerUri.includes(".gltf")) {
            return "3d";
        }

        return "image";
    };

    const isBase64Content = (uri: string) => {
        return uri.startsWith("data:");
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 5));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1));
    const handleZoomReset = () => setZoom(1);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const mediaUri = getBestMediaUri();
    // Use actually detected media type, fall back to pattern matching while detecting
    const mediaType = detectedMediaType || (isDetecting ? "image" : getMediaType());

    const renderMedia = () => {
        if (!mediaUri) {
            // No media URI found

            return (
                <div className="flex flex-col items-center justify-center w-full p-8 bg-gray-800 rounded-lg h-96">
                    <p className="mb-4 text-gray-400">No media available</p>
                    <div className="max-w-md space-y-1 text-xs text-center text-gray-500">
                        <p>NFT ID: {nft?.id || "Unknown"}</p>
                        <p>Has metadata: {nft?.metadata ? "Yes" : "No"}</p>
                        {nft.metadata?.artifactUri && <p>Artifact URI: {nft.metadata.artifactUri.slice(0, 50)}...</p>}
                        {nft.metadata?.displayUri && <p>Display URI: {nft.metadata.displayUri.slice(0, 50)}...</p>}
                        {nft.metadata?.image && <p>Image URI: {nft.metadata.image.slice(0, 50)}...</p>}
                    </div>
                </div>
            );
        }

        const containerClass = `relative w-full ${
            isFullscreen ? "h-screen" : "max-h-[70vh]"
        } flex items-center justify-center bg-black rounded-lg overflow-hidden`;

        // Special handling for HTML content sizing
        if (mediaType === "html") {
            const htmlContainerClass = `relative w-full ${
                isFullscreen ? "h-screen p-0" : "h-[70vh] p-4"
            } flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden`;

            return (
                <div className={htmlContainerClass}>
                    <div className="relative w-full h-full overflow-hidden bg-white rounded-lg shadow-2xl max-w-7xl">
                        <iframe
                            ref={iframeRef}
                            src={mediaUri}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            title={`Interactive content for ${nft.metadata?.name || nft.tokenId}`}
                            style={{
                                minHeight: isFullscreen ? "100vh" : "400px",
                            }}
                        />
                        {/* Fullscreen toggle for HTML content */}
                        {!isFullscreen && (
                            <div className="absolute top-4 right-4">
                                <Button
                                    onClick={toggleFullscreen}
                                    size="sm"
                                    variant="secondary"
                                    className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                                >
                                    <Maximize2 size={16} />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        switch (mediaType) {
            case "video":
                return (
                    <div className={containerClass}>
                        <video
                            ref={videoRef}
                            src={mediaUri}
                            className="object-contain max-w-full max-h-full"
                            controls={false}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            style={{ transform: `scale(${zoom})` }}
                        />
                        <div className="absolute flex gap-2 bottom-4 left-4">
                            <Button
                                onClick={togglePlay}
                                size="sm"
                                variant="secondary"
                                className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                            >
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </Button>
                            <Button
                                onClick={toggleMute}
                                size="sm"
                                variant="secondary"
                                className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </Button>
                        </div>
                    </div>
                );

            case "audio":
                return (
                    <div className={containerClass}>
                        <div className="flex flex-col items-center p-8">
                            <div className="flex items-center justify-center w-48 h-48 mb-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600">
                                <Volume2 size={64} className="text-white" />
                            </div>
                            <audio
                                ref={audioRef}
                                src={mediaUri}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="hidden"
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={togglePlay}
                                    size="lg"
                                    variant="secondary"
                                    className="text-white bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                                >
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                </Button>
                                <Button
                                    onClick={toggleMute}
                                    size="lg"
                                    variant="secondary"
                                    className="text-white bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                                >
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case "3d":
                return (
                    <div className={containerClass}>
                        <div className="flex flex-col items-center p-8">
                            <div className="flex items-center justify-center w-48 h-48 mb-6 rounded-lg bg-gradient-to-br from-purple-400 to-pink-600">
                                <div className="text-4xl text-white">🎲</div>
                            </div>
                            <p className="mb-4 text-white">3D Model</p>
                            <Button
                                onClick={() => window.open(mediaUri, "_blank")}
                                variant="secondary"
                                className="text-white bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500"
                            >
                                <ExternalLink size={16} className="mr-2" />
                                Open 3D Model
                            </Button>
                        </div>
                    </div>
                );

            default: // image
                return (
                    <div className={containerClass}>
                        <img
                            src={mediaUri}
                            alt={nft.metadata?.name || `Token #${nft.tokenId}`}
                            className="object-contain max-w-full max-h-full"
                            style={{ transform: `scale(${zoom})` }}
                        />
                        {mediaType === "image" && (
                            <div className="absolute flex gap-2 bottom-4 left-4">
                                <Button
                                    onClick={handleZoomIn}
                                    size="sm"
                                    variant="secondary"
                                    className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                                >
                                    <ZoomIn size={16} />
                                </Button>
                                <Button
                                    onClick={handleZoomOut}
                                    size="sm"
                                    variant="secondary"
                                    className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                                >
                                    <ZoomOut size={16} />
                                </Button>
                                <Button
                                    onClick={handleZoomReset}
                                    size="sm"
                                    variant="secondary"
                                    className="text-white bg-black/80 hover:bg-black/90 border-white/30 hover:border-white/50"
                                >
                                    <RotateCcw size={16} />
                                </Button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm">
            <div className={`${isFullscreen ? "p-0" : "p-4"} w-full h-full flex flex-col`}>
                {/* Header Controls */}
                <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md">
                    <div className="flex items-start gap-3">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {nft.metadata?.name || `Token #${nft.tokenId}`}
                            </h2>
                            {/* Show artist name in the byline */}
                            {nft.metadata?.creators && nft.metadata.creators.length > 0 && (
                                <p className="mt-1 text-sm text-gray-400">
                                    from{" "}
                                    <button
                                        onClick={() =>
                                            window.open(`https://tzkt.io/${nft.metadata?.creators?.[0]}`, "_blank")
                                        }
                                        className="text-gray-300 underline hover:text-white"
                                    >
                                        {isLoadingArtistAliases
                                            ? "Loading..."
                                            : artistAliases[nft.metadata.creators[0]] ||
                                              `${nft.metadata.creators[0].slice(0, 8)}...`}
                                    </button>
                                </p>
                            )}
                        </div>
                        <Badge variant="outline" className="mt-1 text-gray-300 border-gray-600">
                            {mediaType.toUpperCase()}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowMetadata(!showMetadata)}
                            variant="ghost"
                            size="sm"
                            className="text-white border bg-black/20 hover:bg-black/40 hover:text-white border-white/20 hover:border-white/40"
                        >
                            <Info size={16} className="mr-2" />
                            {showMetadata ? "Hide" : "Show"} Details
                        </Button>

                        <Button
                            onClick={toggleFullscreen}
                            variant="ghost"
                            size="sm"
                            className="text-white border bg-black/20 hover:bg-black/40 hover:text-white border-white/20 hover:border-white/40"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </Button>

                        {mediaUri && (
                            <Button
                                onClick={() => window.open(mediaUri, "_blank")}
                                variant="ghost"
                                size="sm"
                                className="text-white border bg-black/20 hover:bg-black/40 hover:text-white border-white/20 hover:border-white/40"
                            >
                                <Download size={16} />
                            </Button>
                        )}

                        <Button
                            onClick={onClose || (() => {})}
                            variant="ghost"
                            size="sm"
                            className="text-white border bg-black/20 hover:bg-black/40 hover:text-white border-white/20 hover:border-white/40"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Media Viewer */}
                    <div className={`${showMetadata ? "flex-1" : "w-full"} flex items-center justify-center p-4`}>
                        {renderMedia()}
                    </div>

                    {/* Metadata Sidebar */}
                    {showMetadata && (
                        <div
                            className="overflow-y-auto transition-transform duration-300 ease-out transform translate-x-0 border-l border-gray-700 w-96 bg-gray-900/95 backdrop-blur-md"
                            style={{
                                animation: "slideInFromRight 300ms ease-out",
                            }}
                        >
                            <div className="p-6">
                                <h3 className="mb-4 text-lg font-semibold text-white">Details</h3>

                                {/* Artist Info - First priority */}
                                {nft.metadata?.creators && nft.metadata.creators.length > 0 && (
                                    <div className="p-4 mb-6 rounded-lg bg-gray-800/50">
                                        <h4 className="mb-3 text-sm font-semibold text-gray-300">Artist</h4>
                                        <div className="space-y-2">
                                            {nft.metadata.creators.map((creatorAddress, index) => (
                                                <div key={creatorAddress} className="flex items-center justify-between">
                                                    <span className="text-sm text-white">
                                                        {isLoadingArtistAliases
                                                            ? "Loading..."
                                                            : artistAliases[creatorAddress] ||
                                                              `${creatorAddress.slice(0, 12)}...`}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            window.open(`https://tzkt.io/${creatorAddress}`, "_blank")
                                                        }
                                                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>View Profile</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collection Info */}
                                <div className="p-4 mb-6 rounded-lg bg-gray-800/50">
                                    <h4 className="mb-3 text-sm font-semibold text-gray-300">Collection</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white">{getCollectionDisplayName()}</span>
                                            <button
                                                onClick={() =>
                                                    window.open(`https://tzkt.io/${nft.contractAddress}`, "_blank")
                                                }
                                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                            >
                                                <ExternalLink size={12} />
                                                <span>View Contract</span>
                                            </button>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-gray-400">Contract:</span>
                                            <span className="font-mono text-xs text-gray-300">
                                                {nft.contractAddress}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* NFT Description */}
                                {nft.metadata?.description && (
                                    <div className="mb-6">
                                        <h4 className="mb-2 text-sm font-semibold text-gray-300">Description</h4>
                                        <p className="text-sm leading-relaxed text-gray-300">
                                            {nft.metadata.description}
                                        </p>
                                    </div>
                                )}

                                {/* Token Info */}
                                <div className="mb-6 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-400">Token ID:</span>
                                        <span className="font-mono text-sm text-white">{nft.tokenId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-gray-400">Standard:</span>
                                        <span className="text-sm text-white">
                                            {nft.standard?.toUpperCase() || "Unknown"}
                                        </span>
                                    </div>
                                    {nft.balance && (
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-400">Owned:</span>
                                            <span className="text-sm text-white">
                                                {nft.balance}
                                                {nft.metadata?.supply && ` / ${nft.metadata.supply}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Attributes */}
                                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="mb-3 text-sm font-semibold text-gray-300">Attributes</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {nft.metadata.attributes.map((attr, index) => (
                                                <div key={index} className="p-2 bg-gray-800 rounded">
                                                    <p className="text-xs text-gray-400">{attr.trait_type}</p>
                                                    <p className="text-sm text-white">{attr.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* External Links */}
                                <div className="space-y-2">
                                    <Button
                                        onClick={() =>
                                            window.open(
                                                `https://objkt.com/tokens/${nft.contractAddress}/${nft.tokenId}?ref=tz1ZzSmVcnVaWNZKJradtrDnjSjzTp6qjTEW`,
                                                "_blank"
                                            )
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-white bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-gray-500 hover:text-white"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View on Objkt
                                    </Button>
                                </div>

                                {/* Debug Info - Collapsible */}
                                <details className="mt-6">
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                        Debug Information
                                    </summary>
                                    <div className="p-3 mt-2 space-y-1 font-mono text-xs rounded bg-gray-800/30">
                                        <div>
                                            <span className="text-gray-400">ID:</span>{" "}
                                            <span className="text-gray-200">{nft.id}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Contract:</span>{" "}
                                            <span className="text-gray-200">{nft.contractAddress}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Token ID:</span>{" "}
                                            <span className="text-gray-200">{nft.tokenId}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Source:</span>{" "}
                                            <span className="text-gray-200">{nft.source?.provider || "unknown"}</span>
                                        </div>
                                        {nft.fetchedAt && (
                                            <div>
                                                <span className="text-gray-400">Fetched:</span>{" "}
                                                <span className="text-gray-200">
                                                    {new Date(nft.fetchedAt).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-400">Has Image:</span>{" "}
                                            <span className="text-gray-200">{nft.hasImage ? "Yes" : "No"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Has Metadata:</span>{" "}
                                            <span className="text-gray-200">{nft.hasMetadata ? "Yes" : "No"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Valid:</span>{" "}
                                            <span className="text-gray-200">{nft.isValid ? "Yes" : "No"}</span>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
