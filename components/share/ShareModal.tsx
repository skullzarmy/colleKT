"use client";

import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Share2,
    Copy,
    Check,
    QrCode,
    Code,
    Sparkles,
    Twitter,
    ExternalLink,
} from "lucide-react";
import {
    GALLERY_STYLES,
    type GalleryStyleId,
    DEFAULT_GALLERY_STYLE,
} from "@/lib/gallery/gallery-styles";

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    basePath: string; // e.g., "/gallery/tz1..." or "/collection/KT1..."
    defaultTitle?: string;
}

export default function ShareModal({
    isOpen,
    onClose,
    basePath,
    defaultTitle = "",
}: ShareModalProps) {
    const [customTitle, setCustomTitle] = useState(defaultTitle);
    const [selectedStyle, setSelectedStyle] = useState<GalleryStyleId>(DEFAULT_GALLERY_STYLE);
    const [cameraMode, setCameraMode] = useState<"walk" | "overview">("walk");
    const [focusToken, setFocusToken] = useState<string>("");
    const [isEmbed, setIsEmbed] = useState<boolean>(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedEmbed, setCopiedEmbed] = useState(false);
    const [activeTab, setActiveTab] = useState<"link" | "qr" | "embed">("link");

    // Construct origin safely in browser
    const origin = typeof window !== "undefined" ? window.location.origin : "https://collekt.fafolab.xyz";

    // Build the query parameter string dynamically
    const shareUrl = useMemo(() => {
        const url = new URL(basePath.startsWith("/") ? basePath : `/${basePath}`, origin);

        if (customTitle.trim()) {
            url.searchParams.set("title", customTitle.trim());
        }
        if (selectedStyle !== DEFAULT_GALLERY_STYLE) {
            url.searchParams.set("style", selectedStyle);
        }
        if (cameraMode !== "walk") {
            url.searchParams.set("mode", cameraMode);
        }
        if (focusToken.trim()) {
            url.searchParams.set("token", focusToken.trim());
        }
        if (isEmbed) {
            url.searchParams.set("embed", "true");
        }

        return url.toString();
    }, [basePath, origin, customTitle, selectedStyle, cameraMode, focusToken, isEmbed]);

    const embedSnippet = useMemo(() => {
        return `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0" allow="accelerometer; camera; gyroscope; vr" title="${
            customTitle.trim() || "colleKT 3D Gallery"
        }"></iframe>`;
    }, [shareUrl, customTitle]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleCopyEmbed = () => {
        navigator.clipboard.writeText(embedSnippet);
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
    };

    const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `Step inside this 3D Tezos gallery on colleKT! ${customTitle ? `"${customTitle}"` : ""}`
    )}&url=${encodeURIComponent(shareUrl)}`;

    const farcasterShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(
        `Check out this 3D gallery on colleKT:`
    )}&embeds[]=${encodeURIComponent(shareUrl)}`;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-6 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                        <Share2 className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                        <span>Share Gallery</span>
                    </DialogTitle>
                    <DialogDescription className="text-zinc-200 text-sm">
                        Customize how this 3D gallery loads with URL parameters, then copy or share.
                    </DialogDescription>
                </DialogHeader>

                {/* URL Parameter Customization Controls */}
                <div className="space-y-4 my-3 p-4 bg-zinc-900/80 rounded-lg border border-zinc-800">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                        <span>URL Option Settings</span>
                    </h3>

                    {/* Custom Title Input */}
                    <div className="space-y-1.5">
                        <Label htmlFor="custom-gallery-title" className="text-xs font-medium text-zinc-300">
                            Custom Gallery Display Title
                        </Label>
                        <Input
                            id="custom-gallery-title"
                            type="text"
                            placeholder="e.g., My Curated Favorites"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="bg-black border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-white h-9 text-sm"
                        />
                    </div>

                    {/* Style Preset Swatches */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-zinc-300">
                            3D Environment Style Preset
                        </Label>
                        <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                            role="radiogroup"
                            aria-label="Select gallery style"
                        >
                            {Object.values(GALLERY_STYLES).map((style) => {
                                const isSelected = selectedStyle === style.id;
                                return (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => setSelectedStyle(style.id)}
                                        role="radio"
                                        aria-checked={isSelected}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-left text-xs transition-all focus-visible:ring-2 focus-visible:ring-white min-h-[44px] ${
                                            isSelected
                                                ? "border-cyan-400 bg-cyan-950/40 text-white font-semibold ring-1 ring-cyan-400"
                                                : "border-zinc-800 bg-black/60 text-zinc-300 hover:border-zinc-700 hover:text-white"
                                        }`}
                                    >
                                        <span
                                            className="w-4 h-4 rounded-full border border-zinc-600 shrink-0 shadow-sm"
                                            style={{ backgroundColor: style.swatchColor }}
                                            aria-hidden="true"
                                        />
                                        <span className="truncate">{style.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Camera Mode & Embed Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="flex items-center justify-between p-2.5 bg-black/50 rounded border border-zinc-800">
                            <Label htmlFor="camera-overview-mode" className="text-xs font-medium text-zinc-300 cursor-pointer">
                                Start in Overview Mode
                            </Label>
                            <Switch
                                id="camera-overview-mode"
                                checked={cameraMode === "overview"}
                                onCheckedChange={(checked) => setCameraMode(checked ? "overview" : "walk")}
                                aria-label="Start in overview mode"
                            />
                        </div>

                        <div className="flex items-center justify-between p-2.5 bg-black/50 rounded border border-zinc-800">
                            <Label htmlFor="embed-clean-mode" className="text-xs font-medium text-zinc-300 cursor-pointer">
                                Chromeless Embed Mode
                            </Label>
                            <Switch
                                id="embed-clean-mode"
                                checked={isEmbed}
                                onCheckedChange={setIsEmbed}
                                aria-label="Chromeless embed mode"
                            />
                        </div>
                    </div>

                    {/* Focus Token Input */}
                    <div className="space-y-1">
                        <Label htmlFor="focus-token-id" className="text-xs font-medium text-zinc-300">
                            Autofocus Token ID (optional)
                        </Label>
                        <Input
                            id="focus-token-id"
                            type="text"
                            placeholder="e.g. 1"
                            value={focusToken}
                            onChange={(e) => setFocusToken(e.target.value)}
                            className="bg-black border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-white h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-zinc-800 mb-4" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === "link"}
                        onClick={() => setActiveTab("link")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
                            activeTab === "link"
                                ? "border-cyan-400 text-white font-semibold"
                                : "border-transparent text-zinc-300 hover:text-white"
                        }`}
                    >
                        Share Link
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "qr"}
                        onClick={() => setActiveTab("qr")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px] flex items-center gap-1.5 ${
                            activeTab === "qr"
                                ? "border-cyan-400 text-white font-semibold"
                                : "border-transparent text-zinc-300 hover:text-white"
                        }`}
                    >
                        <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>QR Code</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "embed"}
                        onClick={() => setActiveTab("embed")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors min-h-[44px] flex items-center gap-1.5 ${
                            activeTab === "embed"
                                ? "border-cyan-400 text-white font-semibold"
                                : "border-transparent text-zinc-300 hover:text-white"
                        }`}
                    >
                        <Code className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Embed Snippet</span>
                    </button>
                </div>

                {/* Tab 1: Share Link */}
                {activeTab === "link" && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={shareUrl}
                                className="bg-black border-zinc-700 text-zinc-200 text-xs font-mono h-11 focus-visible:ring-2 focus-visible:ring-white"
                                aria-label="Generated shareable URL"
                            />
                            <Button
                                onClick={handleCopyLink}
                                className="min-h-[44px] px-4 font-semibold text-black bg-white hover:bg-zinc-200 shrink-0"
                                aria-label={copiedLink ? "Link copied to clipboard" : "Copy gallery link"}
                            >
                                {copiedLink ? (
                                    <>
                                        <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                                        <span>Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-1.5" />
                                        <span>Copy</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Social Share Buttons */}
                        <div className="pt-2 flex flex-wrap gap-2">
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-[44px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                            >
                                <a
                                    href={twitterShareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Share gallery on X (Twitter)"
                                >
                                    <Twitter className="w-4 h-4 mr-1.5 text-cyan-400" />
                                    <span>Share on X</span>
                                </a>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="min-h-[44px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                            >
                                <a
                                    href={farcasterShareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Share gallery on Warpcast / Farcaster"
                                >
                                    <ExternalLink className="w-4 h-4 mr-1.5 text-purple-400" />
                                    <span>Farcaster</span>
                                </a>
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tab 2: QR Code */}
                {activeTab === "qr" && (
                    <div className="flex flex-col items-center justify-center py-4 space-y-4">
                        <div className="p-4 bg-white rounded-xl shadow-lg">
                            <QRCodeSVG
                                value={shareUrl}
                                size={200}
                                level="M"
                                includeMargin
                                aria-label="QR Code to open this 3D gallery on mobile"
                            />
                        </div>
                        <p className="text-xs text-zinc-200 text-center max-w-xs font-medium">
                            Scan with a smartphone or tablet to instantly open this 3D gallery in mobile view.
                        </p>
                    </div>
                )}

                {/* Tab 3: Embed Snippet */}
                {activeTab === "embed" && (
                    <div className="space-y-3">
                        <Label htmlFor="embed-code-textarea" className="text-xs font-medium text-zinc-300">
                            HTML Iframe Embed Code
                        </Label>
                        <textarea
                            id="embed-code-textarea"
                            readOnly
                            rows={4}
                            value={embedSnippet}
                            className="w-full p-2.5 bg-black border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus-visible:ring-2 focus-visible:ring-white resize-none"
                            aria-label="HTML iframe embed code"
                        />
                        <Button
                            onClick={handleCopyEmbed}
                            className="min-h-[44px] w-full font-semibold text-black bg-white hover:bg-zinc-200"
                        >
                            {copiedEmbed ? (
                                <>
                                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                                    <span>Snippet Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-1.5" />
                                    <span>Copy Iframe Embed Snippet</span>
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
