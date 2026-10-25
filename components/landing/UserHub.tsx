"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
    fetchUserCollections,
    fetchUserCurations,
    type DiscoveredCollection,
    type DiscoveredCuration,
} from "@/lib/data/sources/user-discovery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Boxes,
    FolderKanban,
    Search,
    ExternalLink,
    Share2,
    Loader2,
    Layers,
    Image as ImageIcon,
} from "lucide-react";
import ShareModal from "@/components/share/ShareModal";

interface UserHubProps {
    address: string;
    displayName?: string;
}

export default function UserHub({ address, displayName }: UserHubProps) {
    const [collections, setCollections] = useState<DiscoveredCollection[]>([]);
    const [curations, setCurations] = useState<DiscoveredCuration[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<"collections" | "curations">("collections");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Share modal state
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<{ path: string; title: string }>({
        path: "",
        title: "",
    });

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);

        Promise.all([fetchUserCollections(address), fetchUserCurations(address)])
            .then(([cols, curs]) => {
                if (!cancelled) {
                    setCollections(cols);
                    setCurations(curs);
                    if (cols.length === 0 && curs.length > 0) {
                        setActiveTab("curations");
                    }
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [address]);

    const filteredCollections = useMemo(() => {
        if (!searchQuery.trim()) return collections;
        const q = searchQuery.toLowerCase();
        return collections.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.address.toLowerCase().includes(q) ||
                (c.alias && c.alias.toLowerCase().includes(q)) ||
                (c.description && c.description.toLowerCase().includes(q))
        );
    }, [collections, searchQuery]);

    const filteredCurations = useMemo(() => {
        if (!searchQuery.trim()) return curations;
        const q = searchQuery.toLowerCase();
        return curations.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.slug.toLowerCase().includes(q) ||
                (c.description && c.description.toLowerCase().includes(q))
        );
    }, [curations, searchQuery]);

    const handleOpenShare = (path: string, title: string) => {
        setShareTarget({ path, title });
        setShareModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="w-full max-w-5xl p-10 bg-zinc-950/90 rounded-2xl border-2 border-zinc-800 text-center my-8 shadow-2xl">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-200">
                    Discovering collections and curations for {displayName || address.slice(0, 8)}...
                </p>
                <p className="text-xs text-zinc-400 mt-1">Fetching metadata from TzKT and Objkt</p>
            </div>
        );
    }

    if (collections.length === 0 && curations.length === 0) {
        return null;
    }

    return (
        <section
            aria-labelledby="user-hub-heading"
            className="w-full max-w-5xl p-6 sm:p-8 bg-zinc-950/95 rounded-2xl border-2 border-zinc-800 my-8 shadow-2xl space-y-6"
        >
            {/* Studio Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                    <h2 id="user-hub-heading" className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                        <Layers className="w-6 h-6 text-cyan-400 shrink-0" aria-hidden="true" />
                        <span>{displayName ? `${displayName} • Gallery Studio` : "Collections & Curations Studio"}</span>
                    </h2>
                    <p className="text-sm text-zinc-200 mt-1.5 font-normal">
                        Select any collection or curation to step directly into its full 3D interactive gallery.
                    </p>
                </div>

                <Button
                    asChild
                    variant="outline"
                    className="min-h-[44px] border-2 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white font-semibold text-xs px-4 focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                    <Link href={`/gallery/${address}`}>
                        <ExternalLink className="w-4 h-4 mr-2 text-cyan-400" />
                        <span>Full Personal Gallery</span>
                    </Link>
                </Button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
                {/* Accessible Tabs */}
                <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === "collections"}
                        onClick={() => setActiveTab("collections")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                            activeTab === "collections"
                                ? "bg-white text-zinc-950 shadow-md"
                                : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                        }`}
                    >
                        <Boxes className="w-4 h-4" aria-hidden="true" />
                        <span>Collections ({collections.length})</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "curations"}
                        onClick={() => setActiveTab("curations")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] ${
                            activeTab === "curations"
                                ? "bg-white text-zinc-950 shadow-md"
                                : "text-zinc-200 hover:text-white hover:bg-zinc-800/80"
                        }`}
                    >
                        <FolderKanban className="w-4 h-4" aria-hidden="true" />
                        <span>Curations ({curations.length})</span>
                    </button>
                </div>

                {/* Accessible Search Input */}
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-4 h-4 text-zinc-300 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <Input
                        type="text"
                        placeholder={`Filter ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-zinc-900/90 border-2 border-zinc-700 text-white placeholder:text-zinc-300 focus-visible:ring-2 focus-visible:ring-cyan-400 text-xs rounded-xl"
                        aria-label={`Search and filter ${activeTab}`}
                    />
                </div>
            </div>

            {/* Collections Grid */}
            {activeTab === "collections" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCollections.length === 0 ? (
                        <div className="p-8 text-center col-span-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
                            <p className="text-sm text-zinc-200 italic">
                                No collections found matching "{searchQuery}".
                            </p>
                        </div>
                    ) : (
                        filteredCollections.map((col) => (
                            <div
                                key={col.address}
                                className="flex flex-col justify-between p-5 bg-zinc-900/90 rounded-2xl border-2 border-zinc-700/80 hover:border-zinc-500 transition-all space-y-4 shadow-xl"
                            >
                                <div className="space-y-3">
                                    {/* Header: Logo + Title + Badges */}
                                    <div className="flex items-start gap-3.5">
                                        {col.logo ? (
                                            <img
                                                src={col.logo}
                                                alt={`${col.name} logo`}
                                                className="w-14 h-14 rounded-xl object-cover border-2 border-zinc-600 bg-zinc-800 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shrink-0">
                                                <ImageIcon className="w-6 h-6 text-zinc-300" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-bold text-base text-white truncate leading-tight">
                                                    {col.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {col.isAleatory && (
                                                        <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-purple-950 text-purple-200 border border-purple-700 shrink-0">
                                                            ALEATORY-001
                                                        </span>
                                                    )}
                                                    {col.tokensCount !== undefined && col.tokensCount > 0 && (
                                                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-zinc-800 text-zinc-100 border border-zinc-600 shrink-0">
                                                            {col.tokensCount} tokens
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="font-mono text-xs text-zinc-300 truncate mt-1">
                                                {col.address}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {col.description && (
                                        <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                                            {col.description}
                                        </p>
                                    )}

                                    {/* Preview Token Thumbnails Strip */}
                                    {col.previewTokens && col.previewTokens.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="grid grid-cols-4 gap-2">
                                                {col.previewTokens.slice(0, 4).map((pt, idx) => {
                                                    const imgUri = pt.thumbnailUri || pt.displayUri;
                                                    return (
                                                        <div
                                                            key={`${pt.tokenId}-${idx}`}
                                                            className="aspect-square rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/80 relative group"
                                                            title={pt.name || `Token #${pt.tokenId}`}
                                                        >
                                                            {imgUri ? (
                                                                <img
                                                                    src={imgUri}
                                                                    alt={pt.name || "Token preview"}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300 font-mono">
                                                                    #{pt.tokenId}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-800">
                                    <Button
                                        asChild
                                        size="sm"
                                        className="min-h-[44px] flex-1 font-bold text-xs text-zinc-950 bg-white hover:bg-zinc-100 shadow-md focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
                                    >
                                        <Link href={`/collection/${col.address}`}>
                                            <span>Enter 3D Gallery</span>
                                        </Link>
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleOpenShare(`/collection/${col.address}`, col.name)
                                        }
                                        className="min-h-[44px] min-w-[44px] px-3 bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-600 flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors shadow"
                                        aria-label={`Share ${col.name} 3D gallery`}
                                    >
                                        <Share2 className="w-4 h-4 text-white" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Curations Grid */}
            {activeTab === "curations" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCurations.length === 0 ? (
                        <div className="p-8 text-center col-span-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
                            <p className="text-sm text-zinc-200 italic">
                                No curations found matching "{searchQuery}".
                            </p>
                        </div>
                    ) : (
                        filteredCurations.map((cur) => (
                            <div
                                key={cur.id}
                                className="flex flex-col justify-between p-5 bg-zinc-900/90 rounded-2xl border-2 border-zinc-700/80 hover:border-zinc-500 transition-all space-y-4 shadow-xl"
                            >
                                <div className="space-y-3">
                                    {/* Header: Logo + Title + Badges */}
                                    <div className="flex items-start gap-3.5">
                                        {cur.logo ? (
                                            <img
                                                src={cur.logo}
                                                alt={`${cur.name} logo`}
                                                className="w-14 h-14 rounded-xl object-cover border-2 border-zinc-600 bg-zinc-800 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shrink-0">
                                                <FolderKanban className="w-6 h-6 text-zinc-300" />
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-bold text-base text-white truncate leading-tight">
                                                    {cur.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-cyan-950 text-cyan-200 border border-cyan-700 shrink-0">
                                                        Curated
                                                    </span>
                                                    {cur.itemsCount !== undefined && cur.itemsCount > 0 && (
                                                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-zinc-800 text-zinc-100 border border-zinc-600 shrink-0">
                                                            {cur.itemsCount} items
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="font-mono text-xs text-zinc-300 truncate mt-1">
                                                slug: {cur.slug}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {cur.description && (
                                        <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                                            {cur.description}
                                        </p>
                                    )}

                                    {/* Preview Token Thumbnails Strip */}
                                    {cur.previewTokens && cur.previewTokens.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="grid grid-cols-4 gap-2">
                                                {cur.previewTokens.slice(0, 4).map((pt, idx) => {
                                                    const imgUri = pt.thumbnailUri || pt.displayUri;
                                                    return (
                                                        <div
                                                            key={`${pt.tokenId}-${idx}`}
                                                            className="aspect-square rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800/80 relative group"
                                                            title={pt.name || `Token #${pt.tokenId}`}
                                                        >
                                                            {imgUri ? (
                                                                <img
                                                                    src={imgUri}
                                                                    alt={pt.name || "Token preview"}
                                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300 font-mono">
                                                                    #{pt.tokenId}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-800">
                                    <Button
                                        asChild
                                        size="sm"
                                        className="min-h-[44px] flex-1 font-bold text-xs text-zinc-950 bg-white hover:bg-zinc-100 shadow-md focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
                                    >
                                        <Link href={`/curation/${cur.slug || cur.id}`}>
                                            <span>Enter 3D Gallery</span>
                                        </Link>
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleOpenShare(`/curation/${cur.slug || cur.id}`, cur.name)
                                        }
                                        className="min-h-[44px] min-w-[44px] px-3 bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-600 flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-cyan-400 transition-colors shadow"
                                        aria-label={`Share ${cur.name} 3D gallery`}
                                    >
                                        <Share2 className="w-4 h-4 text-white" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Share Modal Dialog */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                basePath={shareTarget.path}
                defaultTitle={shareTarget.title}
            />
        </section>
    );
}
