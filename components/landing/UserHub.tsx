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
    Sparkles,
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
                    // Default to curations if no collections but has curations
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
                (c.alias && c.alias.toLowerCase().includes(q))
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
            <div className="w-full max-w-4xl p-8 bg-zinc-950/80 rounded-xl border border-zinc-800 text-center my-6">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 font-medium">Discovering collections and curations...</p>
            </div>
        );
    }

    if (collections.length === 0 && curations.length === 0) {
        return null;
    }

    return (
        <section
            aria-labelledby="user-hub-heading"
            className="w-full max-w-4xl p-6 bg-zinc-950/90 rounded-2xl border border-zinc-800/90 my-8 shadow-2xl space-y-6"
        >
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                    <h2 id="user-hub-heading" className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-cyan-400" aria-hidden="true" />
                        <span>{displayName ? `${displayName}'s Hub` : "Your Collections & Curations"}</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                        Select any collection or curation to step directly into its 3D gallery.
                    </p>
                </div>

                {/* Main Gallery Link */}
                <Button
                    asChild
                    variant="outline"
                    className="min-h-[44px] border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
                >
                    <Link href={`/gallery/${address}`}>
                        <ExternalLink className="w-4 h-4 mr-2 text-cyan-400" />
                        <span>Full Personal Gallery</span>
                    </Link>
                </Button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex bg-zinc-900/90 p-1 rounded-lg border border-zinc-800" role="tablist">
                    <button
                        role="tab"
                        aria-selected={activeTab === "collections"}
                        onClick={() => setActiveTab("collections")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
                            activeTab === "collections"
                                ? "bg-white text-black shadow"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <Boxes className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Collections ({collections.length})</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "curations"}
                        onClick={() => setActiveTab("curations")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all min-h-[38px] ${
                            activeTab === "curations"
                                ? "bg-white text-black shadow"
                                : "text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                        <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Curations ({curations.length})</span>
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <Input
                        type="text"
                        placeholder={`Filter ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 bg-black/80 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-white text-xs"
                        aria-label={`Search ${activeTab}`}
                    />
                </div>
            </div>

            {/* Collections Grid */}
            {activeTab === "collections" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredCollections.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-6 text-center col-span-2">
                            No collections found matching "{searchQuery}".
                        </p>
                    ) : (
                        filteredCollections.map((col) => (
                            <div
                                key={col.address}
                                className="flex flex-col justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-semibold text-sm text-white truncate">{col.name}</h3>
                                        {col.isAleatory && (
                                            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                                                ALEATORY-001
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-mono text-[11px] text-zinc-400 truncate">{col.address}</p>
                                    {col.tokensCount !== undefined && col.tokensCount > 0 && (
                                        <p className="text-xs text-zinc-400">{col.tokensCount} tokens</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                                    <Button
                                        asChild
                                        size="sm"
                                        className="min-h-[44px] flex-1 font-semibold text-xs text-black bg-white hover:bg-zinc-200"
                                    >
                                        <Link href={`/collection/${col.address}`}>
                                            <span>Enter 3D Gallery</span>
                                        </Link>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleOpenShare(`/collection/${col.address}`, col.name)
                                        }
                                        className="min-h-[44px] px-3 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                        aria-label={`Share ${col.name} gallery`}
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Curations Grid */}
            {activeTab === "curations" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredCurations.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-6 text-center col-span-2">
                            No curations found matching "{searchQuery}".
                        </p>
                    ) : (
                        filteredCurations.map((cur) => (
                            <div
                                key={cur.id}
                                className="flex flex-col justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-semibold text-sm text-white truncate">{cur.name}</h3>
                                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                                            Curated
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">{cur.itemsCount} artworks</p>
                                    {cur.description && (
                                        <p className="text-xs text-zinc-400 line-clamp-2">{cur.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                                    <Button
                                        asChild
                                        size="sm"
                                        className="min-h-[44px] flex-1 font-semibold text-xs text-black bg-white hover:bg-zinc-200"
                                    >
                                        <Link href={`/curation/${cur.slug || cur.id}`}>
                                            <span>Enter 3D Gallery</span>
                                        </Link>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            handleOpenShare(`/curation/${cur.slug || cur.id}`, cur.name)
                                        }
                                        className="min-h-[44px] px-3 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                        aria-label={`Share ${cur.name} gallery`}
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Embedded Share Modal */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                basePath={shareTarget.path}
                defaultTitle={shareTarget.title}
            />
        </section>
    );
}
