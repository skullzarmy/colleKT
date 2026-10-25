"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    X,
    Maximize2,
    Minimize2,
    Info,
    ExternalLink,
    Play,
    Pause,
    Volume2,
    VolumeX,
    RotateCcw,
    ZoomIn,
    ZoomOut,
    ShoppingCart,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    Code,
    Coins,
} from "lucide-react";
import { UnifiedToken } from "@/lib/data/types/token-types";
import { useWallet } from "@/contexts/WalletContext";
import {
    fetchTokenListing,
    fulfillAskWithReferral,
    ActiveListing,
    PLATFORM_REFERRER,
} from "@/lib/tezos/market-service";
import AleatoryFrame from "@/components/aleatory/AleatoryFrame";

interface MediaModalProps {
    nft: UnifiedToken | null;
    onClose?: () => void;
}

export default function MediaModal({ nft, onClose }: MediaModalProps) {
    const { client, isConnected, connect, getClient } = useWallet();

    const [showMetadata, setShowMetadata] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [detectedMediaType, setDetectedMediaType] = useState<string | null>(null);
    const [isDetecting, setIsDetecting] = useState(false);

    // Artist aliases
    const [artistAliases, setArtistAliases] = useState<{ [address: string]: string | null }>({});
    const [isLoadingArtistAliases, setIsLoadingArtistAliases] = useState(false);

    // Marketplace / Listing & Buying state
    const [listing, setListing] = useState<ActiveListing | null>(null);
    const [isLoadingListing, setIsLoadingListing] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [buyError, setBuyError] = useState<string | null>(null);
    const [buySuccessHash, setBuySuccessHash] = useState<string | null>(null);

    // Interactive / Aleatory code runner state
    const [interactiveCode, setInteractiveCode] = useState<string | null>(null);
    const [isLoadingCode, setIsLoadingCode] = useState(false);
    const [useAleatoryHarness, setUseAleatoryHarness] = useState(false);
    const [extractedFeatures, setExtractedFeatures] = useState<Record<string, string | number | boolean> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const currentNftIdRef = useRef<string | null>(null);

    // Reset states when NFT changes
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
            setArtistAliases({});
            setIsLoadingArtistAliases(false);
            setListing(null);
            setIsLoadingListing(false);
            setIsBuying(false);
            setBuyError(null);
            setBuySuccessHash(null);
            setInteractiveCode(null);
            setIsLoadingCode(false);
            setUseAleatoryHarness(false);
            setExtractedFeatures(null);
        }
    }, [nft?.id]);

    // Keyboard listener for Escape to close modal (WCAG AA requirement)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && onClose) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Fetch artist alias from TzKT accounts endpoint
    const fetchArtistAlias = async (artistAddress: string): Promise<string | null> => {
        try {
            const response = await fetch(`https://api.tzkt.io/v1/accounts/${artistAddress}`);
            if (!response.ok) return null;
            const account = await response.json();
            return account.alias || null;
        } catch {
            return null;
        }
    };

    // Effect to fetch artist aliases when NFT changes
    useEffect(() => {
        if (nft?.metadata?.creators && nft.metadata.creators.length > 0) {
            setIsLoadingArtistAliases(true);
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

    // Fetch active marketplace listing via Objkt GraphQL
    useEffect(() => {
        if (!nft?.contractAddress || nft.tokenId === undefined) return;

        let isMounted = true;
        setIsLoadingListing(true);
        setBuyError(null);
        setBuySuccessHash(null);

        fetchTokenListing(nft.contractAddress, String(nft.tokenId))
            .then((activeListing) => {
                if (isMounted) {
                    setListing(activeListing);
                    setIsLoadingListing(false);
                }
            })
            .catch((err) => {
                console.warn("[MediaModal] Failed to fetch listing:", err);
                if (isMounted) {
                    setListing(null);
                    setIsLoadingListing(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [nft?.contractAddress, nft?.tokenId]);

    // Actually detect the media type by fetching headers
    const detectActualMediaType = async (uri: string): Promise<string> => {
        try {
            if (uri.startsWith("data:")) {
                const mimeType = uri.split(";")[0].split(":")[1];
                if (mimeType.startsWith("image/")) return "image";
                if (mimeType.startsWith("video/")) return "video";
                if (mimeType.startsWith("audio/")) return "audio";
                if (mimeType.includes("text/html")) return "html";
                return "image";
            }

            const response = await fetch(uri, { method: "HEAD" });
            const contentType = response.headers.get("content-type") || "";

            if (contentType.startsWith("image/")) return "image";
            if (contentType.startsWith("video/")) return "video";
            if (contentType.startsWith("audio/")) return "audio";
            if (contentType.includes("text/html") || contentType.includes("application/html")) return "html";
            if (contentType.includes("model/") || contentType.includes("application/octet-stream")) return "3d";

            const partialResponse = await fetch(uri, {
                headers: { Range: "bytes=0-1023" },
            });
            const text = await partialResponse.text();

            if (
                text.includes("<!DOCTYPE html") ||
                text.includes("<html") ||
                text.includes("fxhash") ||
                text.includes("editArt") ||
                text.includes("p5")
            ) {
                return "html";
            }

            return "image";
        } catch {
            return "image";
        }
    };

    // Effect to stop media when NFT changes
    useEffect(() => {
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
        if (!nft) return;

        const rawUri = nft.metadata?.artifactUri || nft.metadata?.displayUri || nft.metadata?.image;

        if (rawUri && !isDetecting && !detectedMediaType) {
            setIsDetecting(true);
            setDetectedMediaType(null);

            const testUri = rawUri.startsWith("ipfs://")
                ? `https://ipfs.fileship.xyz/${rawUri.replace("ipfs://", "").replace(/^([a-zA-Z0-9]+)\?/, "$1/?")}`
                : rawUri;

            detectActualMediaType(testUri)
                .then((type) => {
                    setDetectedMediaType(type);
                    setIsDetecting(false);
                })
                .catch(() => {
                    setIsDetecting(false);
                });
        }
    }, [nft?.id, isDetecting, detectedMediaType]);

    // Aleatory & Generative detection
    const isAleatory = Boolean(
        nft &&
        (nft.standard === "aleatory" ||
            nft.standard === "aleatory-generator" ||
            nft.metadata?.tags?.some((t) => t.toLowerCase().includes("aleatory")) ||
            nft.contractAlias?.toLowerCase().includes("aleatory"))
    );

    const isEditArt = Boolean(
        nft &&
        (nft.metadata?.symbol?.toUpperCase() === "EDITART" ||
            (nft as any).symbol?.toUpperCase() === "EDITART" ||
            nft.contractAlias?.toLowerCase().includes("editart") ||
            nft.metadata?.tags?.some((t) => t.toLowerCase().includes("editart")) ||
            nft.metadata?.artifactUri?.toLowerCase().includes("editart") ||
            nft.metadata?.artifactUri?.toLowerCase().includes("?m0="))
    );

    const isGenerator = Boolean(
        nft &&
        (nft.standard === "aleatory-generator" ||
            nft.metadata?.attributes?.some((a) => a.trait_type?.toLowerCase() === "generator") ||
            isEditArt)
    );

    const getCollectionDisplayName = () => {
        if (!nft) return "";
        if (nft.contractAlias) return nft.contractAlias;
        return `${nft.contractAddress.slice(0, 8)}...${nft.contractAddress.slice(-4)}`;
    };

    const getIPFSUrl = (uri: string, preferStandardGateway = false) => {
        if (!uri) return "";
        if (uri.startsWith("data:")) return uri;

        if (uri.startsWith("ipfs://")) {
            let withoutProtocol = uri.replace("ipfs://", "");
            // Handle CID followed directly by query params without trailing slash, e.g. Qm123?m0=... -> Qm123/?m0=...
            withoutProtocol = withoutProtocol.replace(/^([a-zA-Z0-9]+)\?/, "$1/?");
            if (preferStandardGateway) {
                return `https://ipfs.io/ipfs/${withoutProtocol}`;
            }
            return `https://ipfs.fileship.xyz/${withoutProtocol}`;
        }
        return uri;
    };

    const getRawMediaUri = () => {
        if (!nft) return null;
        const artifact = nft.metadata?.artifactUri;
        const display = nft.metadata?.displayUri;
        const image = nft.metadata?.image;

        if (artifact) return artifact;
        if (display) return display;
        if (image) return image;
        return null;
    };

    const isHtmlContent = (uri: string, mimeType?: string) => {
        const lowerUri = uri.toLowerCase();
        const lowerMime = mimeType?.toLowerCase() || "";

        if (lowerMime.includes("text/html") || lowerMime.includes("application/html")) return true;
        if (
            lowerUri.includes("?fxhash=") ||
            lowerUri.includes("&fxhash=") ||
            lowerUri.includes(".html") ||
            lowerUri.includes(".htm") ||
            lowerUri.includes("fxhash.xyz") ||
            lowerUri.includes("gateway.fxhash") ||
            lowerUri.includes("text/html") ||
            lowerUri.includes("html") ||
            lowerUri.includes("?m0=") ||
            lowerUri.includes("&m0=") ||
            lowerUri.includes("editart") ||
            lowerUri.includes("?seed=") ||
            lowerUri.includes("&seed=") ||
            lowerUri.includes("?hash=") ||
            lowerUri.includes("&hash=")
        ) return true;

        if (
            isEditArt ||
            isAleatory ||
            nft?.metadata?.tags?.some((t) => t.toLowerCase().includes("generative") || t.toLowerCase().includes("interactive"))
        ) {
            return true;
        }

        return false;
    };

    const getMediaType = () => {
        const rawUri = getRawMediaUri() || "";
        if (rawUri.startsWith("data:")) {
            const mimeType = rawUri.split(";")[0].split(":")[1].toLowerCase();
            if (mimeType.startsWith("video/")) return "video";
            if (mimeType.startsWith("audio/")) return "audio";
            if (mimeType.startsWith("image/")) return "image";
            if (mimeType.includes("text/html")) return "html";
            return "image";
        }

        const lowerUri = rawUri.toLowerCase();
        if (lowerUri.includes(".mp4") || lowerUri.includes(".webm") || lowerUri.includes(".mov")) return "video";
        if (lowerUri.includes(".mp3") || lowerUri.includes(".wav") || lowerUri.includes(".ogg")) return "audio";
        if (isHtmlContent(lowerUri)) return "html";
        if (lowerUri.includes(".glb") || lowerUri.includes(".gltf")) return "3d";

        return "image";
    };

    const getBestMediaUri = () => {
        const rawUri = getRawMediaUri();
        if (!rawUri) return null;
        const type = detectedMediaType || getMediaType();
        const isHtml = type === "html";
        return getIPFSUrl(rawUri, isHtml);
    };

    const getAudioCoverUri = () => {
        if (!nft) return null;
        const cover = nft.metadata?.displayUri || nft.metadata?.thumbnailUri || nft.metadata?.image;
        if (!cover) return null;
        return getIPFSUrl(cover);
    };

    const mediaUri = getBestMediaUri();
    const mediaType = detectedMediaType || (isDetecting ? "image" : getMediaType());

    // Fetch interactive code when HTML is detected or Aleatory is flagged
    useEffect(() => {
        if (!nft || !mediaUri) return;
        if ((mediaType === "html" || isAleatory) && !interactiveCode && !isLoadingCode) {
            if (isAleatory) {
                setIsLoadingCode(true);
                fetch(mediaUri)
                    .then((res) => res.text())
                    .then((codeText) => {
                        setInteractiveCode(codeText);
                        setIsLoadingCode(false);
                        setUseAleatoryHarness(true);
                    })
                    .catch((e) => {
                        console.warn("[MediaModal] Failed to fetch interactive code text:", e);
                        setIsLoadingCode(false);
                    });
            }
        }
    }, [nft, mediaType, isAleatory, mediaUri, interactiveCode, isLoadingCode]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
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
    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    // In-Modal Collect / Buy Action with Platform Referrer
    const handleBuy = async () => {
        if (!listing) return;
        if (!isConnected) {
            await connect();
            return;
        }

        setIsBuying(true);
        setBuyError(null);
        setBuySuccessHash(null);

        try {
            const activeClient = client || (await getClient());
            const { hash } = await fulfillAskWithReferral(activeClient, listing, PLATFORM_REFERRER);
            setBuySuccessHash(hash);
            setIsBuying(false);
        } catch (err: unknown) {
            console.error("[MediaModal] Buy transaction failed:", err);
            const msg = err instanceof Error ? err.message : "Failed to execute purchase transaction";
            setBuyError(msg);
            setIsBuying(false);
        }
    };

    const renderMedia = () => {
        if (!nft) return null;

        if (!mediaUri) {
            return (
                <div className="flex flex-col items-center justify-center w-full p-8 bg-zinc-900 rounded-lg h-96">
                    <p className="mb-4 text-zinc-300">No media available</p>
                    <div className="max-w-md space-y-1 text-xs text-center text-zinc-400">
                        <p>NFT ID: {nft.id}</p>
                        <p>Has metadata: {nft.metadata ? "Yes" : "No"}</p>
                    </div>
                </div>
            );
        }

        const containerClass = `relative w-full ${
            isFullscreen ? "h-screen" : "h-[70vh]"
        } flex items-center justify-center bg-black rounded-lg overflow-hidden`;

        // Handle HTML / Interactive Content with Aleatory Frame Option
        if (mediaType === "html" || (isAleatory && interactiveCode)) {
            const htmlContainerClass = `relative w-full ${
                isFullscreen ? "h-screen p-0" : "h-[70vh] p-2"
            } flex items-center justify-center bg-zinc-950 rounded-lg overflow-hidden`;

            return (
                <div className={htmlContainerClass}>
                    <div className="relative w-full h-full overflow-hidden bg-black rounded-lg shadow-2xl max-w-7xl">
                        {useAleatoryHarness && interactiveCode ? (
                            <AleatoryFrame
                                code={interactiveCode}
                                seed={
                                    (nft.metadata?.attributes?.find((a) => a.trait_type?.toLowerCase() === "seed")
                                        ?.value as string) || `0x${nft.tokenId}`
                                }
                                title={nft.metadata?.name || `Token #${nft.tokenId}`}
                                onFeaturesReady={(features) => setExtractedFeatures(features)}
                            />
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={mediaUri}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                title={`Interactive content for ${nft.metadata?.name || nft.tokenId}`}
                                style={{ minHeight: isFullscreen ? "100vh" : "400px" }}
                            />
                        )}

                        {/* Top controls: Aleatory runner toggle & Fullscreen */}
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                            {interactiveCode && (
                                <Button
                                    onClick={() => setUseAleatoryHarness(!useAleatoryHarness)}
                                    size="sm"
                                    variant="secondary"
                                    className="text-xs text-white bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 min-h-[36px] px-3 focus-visible:ring-2 focus-visible:ring-cyan-400"
                                    title={useAleatoryHarness ? "Switch to standard iframe" : "Run in deterministic $alea harness"}
                                >
                                    <Sparkles size={14} className="mr-1.5 text-cyan-400" />
                                    {useAleatoryHarness ? "$alea Harness" : "Raw Web"}
                                </Button>
                            )}

                            {!isFullscreen && (
                                <Button
                                    onClick={toggleFullscreen}
                                    size="sm"
                                    variant="secondary"
                                    aria-label="Toggle Fullscreen"
                                    className="text-white bg-black/80 hover:bg-black/95 border-zinc-700 min-h-[36px] min-w-[36px] p-2 focus-visible:ring-2 focus-visible:ring-cyan-400"
                                >
                                    <Maximize2 size={16} />
                                </Button>
                            )}
                        </div>
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
                                aria-label={isPlaying ? "Pause video" : "Play video"}
                                className="text-white bg-black/80 hover:bg-black/90 border-zinc-700 min-h-[44px] min-w-[44px]"
                            >
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </Button>
                            <Button
                                onClick={toggleMute}
                                size="sm"
                                variant="secondary"
                                aria-label={isMuted ? "Unmute video" : "Mute video"}
                                className="text-white bg-black/80 hover:bg-black/90 border-zinc-700 min-h-[44px] min-w-[44px]"
                            >
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </Button>
                        </div>
                    </div>
                );

            case "audio": {
                const coverUri = getAudioCoverUri();
                return (
                    <div className={containerClass}>
                        <div className="flex flex-col items-center p-8">
                            <div className="relative w-64 h-64 mb-6 overflow-hidden rounded-lg shadow-2xl group">
                                {coverUri ? (
                                    <img
                                        src={coverUri}
                                        alt="Album art"
                                        className="absolute inset-0 object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
                                        <Volume2 size={64} className="text-white" />
                                    </div>
                                )}
                                <div className="absolute inset-0 transition-colors bg-black/20 group-hover:bg-black/40" />
                                <button
                                    onClick={togglePlay}
                                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                                    className="absolute inset-0 flex items-center justify-center min-h-[44px]"
                                >
                                    <span className="flex items-center justify-center text-white transition-transform rounded-full w-20 h-20 bg-black/60 hover:bg-black/80 hover:scale-105">
                                        {isPlaying ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
                                    </span>
                                </button>
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
                                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                                    className="text-white bg-zinc-800 border-zinc-700 hover:bg-zinc-700 min-h-[44px]"
                                >
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                                </Button>
                                <Button
                                    onClick={toggleMute}
                                    size="lg"
                                    variant="secondary"
                                    aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                                    className="text-white bg-zinc-800 border-zinc-700 hover:bg-zinc-700 min-h-[44px]"
                                >
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            }

            case "3d":
                return (
                    <div className={containerClass}>
                        <div className="flex flex-col items-center p-8">
                            <div className="flex items-center justify-center w-48 h-48 mb-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                                <div className="text-4xl text-white">🎲</div>
                            </div>
                            <p className="mb-4 text-white font-medium">3D Interactive Model</p>
                            <Button
                                onClick={() => window.open(mediaUri, "_blank")}
                                variant="secondary"
                                className="text-white bg-zinc-800 border-zinc-700 hover:bg-zinc-700 min-h-[44px]"
                            >
                                <ExternalLink size={16} className="mr-2" />
                                Open 3D Model in New Tab
                            </Button>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className={containerClass}>
                        <img
                            src={mediaUri}
                            alt={nft.metadata?.name || `Token #${nft.tokenId}`}
                            className="object-contain max-w-full max-h-full"
                            style={{ transform: `scale(${zoom})` }}
                        />
                        <div className="absolute flex gap-2 bottom-4 left-4">
                            <Button
                                onClick={handleZoomIn}
                                size="sm"
                                variant="secondary"
                                aria-label="Zoom In"
                                className="text-white bg-black/80 hover:bg-black/95 border-zinc-700 min-h-[44px] min-w-[44px]"
                            >
                                <ZoomIn size={16} />
                            </Button>
                            <Button
                                onClick={handleZoomOut}
                                size="sm"
                                variant="secondary"
                                aria-label="Zoom Out"
                                className="text-white bg-black/80 hover:bg-black/95 border-zinc-700 min-h-[44px] min-w-[44px]"
                            >
                                <ZoomOut size={16} />
                            </Button>
                            <Button
                                onClick={handleZoomReset}
                                size="sm"
                                variant="secondary"
                                aria-label="Reset Zoom"
                                className="text-white bg-black/80 hover:bg-black/95 border-zinc-700 min-h-[44px] min-w-[44px]"
                            >
                                <RotateCcw size={16} />
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    if (!nft) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-modal-title"
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md"
        >
            <div className={`${isFullscreen ? "p-0" : "p-4"} w-full h-full flex flex-col`}>
                {/* Header Controls */}
                <div className="flex items-center justify-between p-4 bg-zinc-950/80 border-b border-zinc-800">
                    <div className="flex items-start gap-3">
                        <div>
                            <h2 id="media-modal-title" className="text-xl font-bold text-white">
                                {nft.metadata?.name || `Token #${nft.tokenId}`}
                            </h2>
                            {nft.metadata?.creators && nft.metadata.creators.length > 0 && (
                                <p className="mt-1 text-sm text-zinc-300">
                                    by{" "}
                                    <button
                                        onClick={() =>
                                            window.open(`https://tzkt.io/${nft.metadata?.creators?.[0]}`, "_blank")
                                        }
                                        aria-label={`View artist profile for ${artistAliases[nft.metadata.creators[0]] || nft.metadata.creators[0]}`}
                                        className="text-cyan-300 hover:text-cyan-200 underline font-medium focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-sm"
                                    >
                                        {isLoadingArtistAliases
                                            ? "Loading..."
                                            : artistAliases[nft.metadata.creators[0]] ||
                                              `${nft.metadata.creators[0].slice(0, 8)}...`}
                                    </button>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-zinc-300 border-zinc-700 bg-zinc-900/60">
                                {mediaType.toUpperCase()}
                            </Badge>
                            {isAleatory && (
                                <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs">
                                    ALEATORY-001
                                </Badge>
                            )}
                            {isEditArt && (
                                <Badge className="bg-amber-950 text-amber-300 border border-amber-800 text-xs">
                                    EDITART
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowMetadata(!showMetadata)}
                            variant="ghost"
                            size="sm"
                            aria-expanded={showMetadata}
                            aria-label={showMetadata ? "Hide token details" : "Show token details"}
                            className="text-white border bg-zinc-900/60 hover:bg-zinc-800 hover:text-white border-zinc-700 min-h-[44px] px-3 focus-visible:ring-2 focus-visible:ring-cyan-400"
                        >
                            <Info size={16} className="mr-2 text-zinc-300" />
                            {showMetadata ? "Hide" : "Show"} Details
                        </Button>

                        <Button
                            onClick={toggleFullscreen}
                            variant="ghost"
                            size="sm"
                            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            className="text-white border bg-zinc-900/60 hover:bg-zinc-800 hover:text-white border-zinc-700 min-h-[44px] min-w-[44px] p-2 focus-visible:ring-2 focus-visible:ring-cyan-400"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </Button>

                        <Button
                            onClick={onClose || (() => {})}
                            variant="ghost"
                            size="sm"
                            aria-label="Close modal"
                            className="text-white border bg-zinc-900/60 hover:bg-red-950/40 hover:text-red-200 border-zinc-700 min-h-[44px] min-w-[44px] p-2 focus-visible:ring-2 focus-visible:ring-red-400"
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
                            className="overflow-y-auto transition-transform duration-300 ease-out transform translate-x-0 border-l border-zinc-800 w-96 bg-zinc-950/95 backdrop-blur-md"
                            style={{ animation: "slideInFromRight 300ms ease-out" }}
                        >
                            <div className="p-6 space-y-6">
                                <h3 className="text-lg font-semibold text-white">Details</h3>

                                {/* In-Modal Marketplace Section */}
                                <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                                            <ShoppingCart size={16} className="text-cyan-400" />
                                            <span>Marketplace</span>
                                        </div>
                                        {listing && (
                                            <Badge variant="outline" className="text-emerald-400 border-emerald-800/80 bg-emerald-950/40 text-xs">
                                                Active Listing
                                            </Badge>
                                        )}
                                    </div>

                                    {isLoadingListing ? (
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 py-2" aria-live="polite">
                                            <Loader2 size={14} className="animate-spin text-cyan-400" />
                                            <span>Checking active listings on Objkt...</span>
                                        </div>
                                    ) : listing ? (
                                        <div className="space-y-3">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-xs text-zinc-400">Price:</span>
                                                <span className="text-xl font-bold text-white tracking-tight">
                                                    {listing.priceTez.toLocaleString(undefined, { maximumFractionDigits: 3 })} XTZ
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                                                <span>Referral Partner:</span>
                                                <span className="font-mono text-zinc-300">skllzrmy.tez</span>
                                            </div>

                                            {buySuccessHash ? (
                                                <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded text-xs text-emerald-200 space-y-1.5" aria-live="polite">
                                                    <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                                                        <CheckCircle2 size={14} />
                                                        <span>Purchase Successful!</span>
                                                    </div>
                                                    <p className="text-[11px] text-emerald-400/90">
                                                        Operation submitted to the Tezos blockchain.
                                                    </p>
                                                    <button
                                                        onClick={() => window.open(`https://tzkt.io/${buySuccessHash}`, "_blank")}
                                                        className="text-cyan-300 underline text-[11px] flex items-center gap-1 hover:text-cyan-200 mt-1"
                                                    >
                                                        <span>View transaction on TzKT</span>
                                                        <ExternalLink size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {buyError && (
                                                        <div className="p-2.5 bg-red-950/50 border border-red-800 rounded text-xs text-red-200 flex items-start gap-2" role="alert">
                                                            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                                            <span className="text-[11px] leading-relaxed">{buyError}</span>
                                                        </div>
                                                    )}

                                                    <Button
                                                        onClick={handleBuy}
                                                        disabled={isBuying}
                                                        aria-label={
                                                            !isConnected
                                                                ? "Connect wallet to buy this token"
                                                                : `Collect for ${listing.priceTez} XTZ`
                                                        }
                                                        className="w-full min-h-[44px] font-semibold text-zinc-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 focus-visible:ring-2 focus-visible:ring-cyan-300 transition-all shadow-md"
                                                    >
                                                        {isBuying ? (
                                                            <span className="flex items-center gap-2">
                                                                <Loader2 size={16} className="animate-spin" />
                                                                <span>Confirming in Wallet...</span>
                                                            </span>
                                                        ) : !isConnected ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <Coins size={16} />
                                                                <span>Connect Wallet to Collect</span>
                                                            </span>
                                                        ) : (
                                                            <span>Collect for {listing.priceTez} XTZ</span>
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-zinc-400 py-1">
                                            <span>No active fixed-price listing found on marketplace.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Aleatory Platform Integration Badge & Controls */}
                                {isAleatory && (
                                    <div className="p-4 rounded-lg bg-zinc-900/80 border border-cyan-900/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
                                                <Sparkles size={16} className="text-cyan-400" />
                                                <span>ALEATORY-001 Standard</span>
                                            </div>
                                            <Badge variant="outline" className="text-cyan-300 border-cyan-800 text-[10px]">
                                                {isGenerator ? "GENERATOR" : "PIECE"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-zinc-300 leading-relaxed">
                                            Deterministic generative contract running on Tezos with sandboxed `$alea` PRNG harness.
                                        </p>
                                        <div className="flex flex-col gap-2 pt-1">
                                            {isGenerator ? (
                                                <Button
                                                    onClick={() => window.open(`https://aleatory.art/generator/${nft.contractAddress}`, "_blank")}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full min-h-[44px] text-cyan-300 border-cyan-800/80 bg-cyan-950/30 hover:bg-cyan-900/50 hover:text-white"
                                                >
                                                    <ExternalLink size={14} className="mr-2" />
                                                    View Generator on Aleatory.art
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => window.open(`https://aleatory.art/piece/${nft.contractAddress}/${nft.tokenId}`, "_blank")}
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full min-h-[44px] text-cyan-300 border-cyan-800/80 bg-cyan-950/30 hover:bg-cyan-900/50 hover:text-white"
                                                >
                                                    <ExternalLink size={14} className="mr-2" />
                                                    View Piece on Aleatory.art
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Extracted On-Chain Features from $alea */}
                                {extractedFeatures && Object.keys(extractedFeatures).length > 0 && (
                                    <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
                                        <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                                            <Code size={14} className="text-cyan-400" />
                                            <span>Generative Features</span>
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            {Object.entries(extractedFeatures).map(([k, v]) => (
                                                <div key={k} className="p-2 bg-zinc-800/90 rounded border border-zinc-700/60">
                                                    <p className="text-[10px] uppercase font-mono text-zinc-400 truncate">{k}</p>
                                                    <p className="text-xs font-semibold text-white truncate">{String(v)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Artist Info */}
                                {nft.metadata?.creators && nft.metadata.creators.length > 0 && (
                                    <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800">
                                        <h4 className="mb-3 text-sm font-semibold text-zinc-200">Artist</h4>
                                        <div className="space-y-2">
                                            {nft.metadata.creators.map((creatorAddress) => (
                                                <div key={creatorAddress} className="flex items-center justify-between">
                                                    <span className="text-sm text-zinc-100 font-medium">
                                                        {isLoadingArtistAliases
                                                            ? "Loading..."
                                                            : artistAliases[creatorAddress] ||
                                                              `${creatorAddress.slice(0, 10)}...`}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            window.open(`https://tzkt.io/${creatorAddress}`, "_blank")
                                                        }
                                                        aria-label={`View TzKT profile for ${creatorAddress}`}
                                                        className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 underline min-h-[36px]"
                                                    >
                                                        <ExternalLink size={12} />
                                                        <span>TzKT Profile</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collection Info */}
                                <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800">
                                    <h4 className="mb-3 text-sm font-semibold text-zinc-200">Collection</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-100 font-medium">{getCollectionDisplayName()}</span>
                                            <button
                                                onClick={() =>
                                                    window.open(`https://tzkt.io/${nft.contractAddress}`, "_blank")
                                                }
                                                aria-label={`View TzKT contract for ${nft.contractAddress}`}
                                                className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 underline min-h-[36px]"
                                            >
                                                <ExternalLink size={12} />
                                                <span>Contract</span>
                                            </button>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-zinc-400">Address:</span>
                                            <span className="font-mono text-xs text-zinc-300 break-all">
                                                {nft.contractAddress}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* NFT Description */}
                                {nft.metadata?.description && (
                                    <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800">
                                        <h4 className="mb-2 text-sm font-semibold text-zinc-200">Description</h4>
                                        <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
                                            {nft.metadata.description}
                                        </p>
                                    </div>
                                )}

                                {/* Token Info */}
                                <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                                    <h4 className="text-sm font-semibold text-zinc-200">Token Details</h4>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-400">Token ID:</span>
                                        <span className="font-mono text-zinc-200">{nft.tokenId}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-zinc-400">Standard:</span>
                                        <span className="text-zinc-200 uppercase">{nft.standard || "FA2"}</span>
                                    </div>
                                    {nft.balance && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Balance:</span>
                                            <span className="text-zinc-200">
                                                {nft.balance}
                                                {nft.metadata?.supply && ` / ${nft.metadata.supply}`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Attributes */}
                                {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold text-zinc-200">Attributes</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {nft.metadata.attributes.map((attr, index) => (
                                                <div key={index} className="p-2.5 bg-zinc-900/90 rounded border border-zinc-800">
                                                    <p className="text-[10px] uppercase font-mono text-zinc-400 truncate">{attr.trait_type}</p>
                                                    <p className="text-xs font-semibold text-zinc-100 truncate">{String(attr.value)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* External Links */}
                                <div className="space-y-2 pt-2">
                                    <Button
                                        onClick={() =>
                                            window.open(
                                                `https://objkt.com/tokens/${nft.contractAddress}/${nft.tokenId}?ref=tz1ZzSmVcnVaWNZKJradtrDnjSjzTp6qjTEW`,
                                                "_blank"
                                            )
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="w-full min-h-[44px] text-zinc-200 bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View on Objkt.com
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
