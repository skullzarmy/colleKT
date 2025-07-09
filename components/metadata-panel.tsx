"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    X,
    ExternalLink,
    Copy,
    ImageIcon,
    Video,
    Music,
    FileText,
    Hash,
    User,
    Building,
    Palette,
    Info,
} from "lucide-react";
import { UnifiedToken } from "@/lib/data/types/token-types";

interface MetadataPanelProps {
    nft: UnifiedToken | null;
    onClose?: () => void;
}

export default function MetadataPanel({ nft, onClose }: MetadataPanelProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [showInteractive, setShowInteractive] = useState(false);

    if (!nft) return null;

    const copyToClipboard = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const isHtmlContent = (uri?: string): boolean => {
        if (!uri) return false;
        const lowerUri = uri.toLowerCase();
        const htmlIndicators = [".html", "text/html", "<html", "<!doctype"];
        return htmlIndicators.some((indicator) => lowerUri.includes(indicator));
    };

    const hasInteractiveContent = (): boolean => {
        return !!(nft.metadata?.artifactUri && isHtmlContent(nft.metadata.artifactUri));
    };

    const getMediaType = () => {
        // No formats field in UnifiedMetadata, use simple heuristics
        const artifactUri = nft.metadata?.artifactUri || "";
        const lowerUri = artifactUri.toLowerCase();

        if (lowerUri.includes(".mp4") || lowerUri.includes(".webm") || lowerUri.includes(".mov")) return "video";
        if (lowerUri.includes(".mp3") || lowerUri.includes(".wav") || lowerUri.includes(".ogg")) return "audio";
        if (lowerUri.includes(".glb") || lowerUri.includes(".gltf")) return "3d";
        return "image";
    };

    const getMediaIcon = () => {
        const type = getMediaType();
        switch (type) {
            case "video":
                return <Video className="w-4 h-4" />;
            case "audio":
                return <Music className="w-4 h-4" />;
            case "3d":
                return <Palette className="w-4 h-4" />;
            default:
                return <ImageIcon className="w-4 h-4" />;
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {showInteractive && hasInteractiveContent() ? (
                // Full-screen interactive iframe view
                <Card className="w-full h-full bg-gray-900 border-gray-700">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                            <Palette className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-lg font-bold text-white">
                                {nft.metadata?.name || `Token #${nft.tokenId}`} - Interactive View
                            </h2>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={() => setShowInteractive(false)}
                                variant="outline"
                                size="sm"
                                className="text-gray-300 border-gray-600 hover:bg-gray-800"
                            >
                                Back to Details
                            </Button>
                            <Button
                                onClick={onClose || (() => {})}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    <div className="h-[calc(100%-80px)] p-4">
                        <iframe
                            src={getIPFSUrl(nft.metadata?.artifactUri || "")}
                            className="w-full h-full border-2 border-gray-600 rounded-lg"
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            title={`Interactive content for ${nft.metadata?.name || nft.tokenId}`}
                        />
                    </div>
                </Card>
            ) : (
                // Standard metadata panel
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gray-900 border-gray-700">
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                            {getMediaIcon()}
                            <h2 className="text-xl font-bold text-white">
                                {nft.metadata?.name || `Token #${nft.tokenId}`}
                            </h2>
                            {hasInteractiveContent() && (
                                <Badge className="bg-cyan-600 hover:bg-cyan-700">Interactive</Badge>
                            )}
                        </div>
                        <Button
                            onClick={onClose || (() => {})}
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        <div className="space-y-6">
                            {/* Description */}
                            {nft.metadata?.description && (
                                <div>
                                    <h3 className="flex items-center mb-2 text-sm font-semibold text-gray-300">
                                        <FileText className="w-4 h-4 mr-2" />
                                        Description
                                    </h3>
                                    <p className="text-sm leading-relaxed text-white">{nft.metadata.description}</p>
                                </div>
                            )}

                            {/* Contract & Token Info */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <h3 className="flex items-center mb-2 text-sm font-semibold text-gray-300">
                                        <Building className="w-4 h-4 mr-2" />
                                        Contract
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                            <span className="font-mono text-sm text-white">
                                                {formatAddress(nft.contractAddress)}
                                            </span>
                                            <Button
                                                onClick={() => copyToClipboard(nft.contractAddress, "contract")}
                                                variant="ghost"
                                                size="sm"
                                                className="w-6 h-6 p-0"
                                            >
                                                {copiedField === "contract" ? (
                                                    <span className="text-xs text-green-400">✓</span>
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="flex items-center mb-2 text-sm font-semibold text-gray-300">
                                        <Hash className="w-4 h-4 mr-2" />
                                        Token Details
                                    </h3>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-400">Token ID:</span>
                                            <span className="text-sm text-white">{nft.tokenId}</span>
                                        </div>
                                        {nft.balance && (
                                            <div className="flex justify-between">
                                                <span className="text-xs text-gray-400">Owned:</span>
                                                <span className="text-sm text-white">{nft.balance}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Creators */}
                            {nft.metadata?.creators && nft.metadata.creators.length > 0 && (
                                <div>
                                    <h3 className="flex items-center mb-2 text-sm font-semibold text-gray-300">
                                        <User className="w-4 h-4 mr-2" />
                                        Creators
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {nft.metadata.creators.map((creator, index) => (
                                            <Badge
                                                key={index}
                                                variant="secondary"
                                                className="text-gray-300 bg-gray-800"
                                            >
                                                {formatAddress(creator)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attributes/Traits */}
                            {nft.metadata?.attributes && nft.metadata.attributes.length > 0 && (
                                <div>
                                    <h3 className="flex items-center mb-2 text-sm font-semibold text-gray-300">
                                        <Palette className="w-4 h-4 mr-2" />
                                        Attributes
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                                        {nft.metadata.attributes.map((attr, index) => (
                                            <div key={index} className="p-3 bg-gray-800 rounded">
                                                <p className="mb-1 text-xs text-gray-400">{attr.trait_type}</p>
                                                <p className="text-sm font-medium text-white">{attr.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {nft.metadata?.tags && nft.metadata.tags.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-sm font-semibold text-gray-300">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {nft.metadata.tags.map((tag, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="text-gray-300 border-gray-600"
                                            >
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* External Links */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-700">
                                {hasInteractiveContent() && (
                                    <Button
                                        onClick={() => setShowInteractive(true)}
                                        className="bg-cyan-600 hover:bg-cyan-700"
                                        size="sm"
                                    >
                                        <Palette className="w-4 h-4 mr-2" />
                                        View Interactive
                                    </Button>
                                )}

                                <Button
                                    onClick={() =>
                                        window.open(
                                            `https://objkt.com/tokens/${nft.contractAddress}/${nft.tokenId}?ref=tz1ZzSmVcnVaWNZKJradtrDnjSjzTp6qjTEW`,
                                            "_blank"
                                        )
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-300 border-gray-600 hover:bg-gray-800"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View on Objkt
                                </Button>

                                {nft.metadata?.artifactUri && (
                                    <Button
                                        onClick={() => {
                                            const uri = nft.metadata?.artifactUri;
                                            if (uri) {
                                                window.open(getIPFSUrl(uri), "_blank");
                                            }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="text-gray-300 border-gray-600 hover:bg-gray-800"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Original File
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
