"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseInput } from "@/lib/data/utils/input-parser";
import { ParsedInput } from "@/lib/data/types/gallery-types";
import { useWallet } from "@/contexts/WalletContext";
import WalletButton from "@/components/wallet/WalletButton";
import UserHub from "@/components/landing/UserHub";
import { ArrowRight, Loader2 } from "lucide-react";

export default function HomePage() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const { address, identity } = useWallet();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        setError("");

        try {
            const result: ParsedInput = await parseInput(input.trim());

            if (!result.isValid) {
                setError(result.error || "Invalid input");
                setIsLoading(false);
                return;
            }

            router.push(result.route);
        } catch {
            setError("Failed to parse input");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen text-white bg-black">
            {/* Top Navigation Bar with Wallet */}
            <header className="w-full flex items-center justify-between p-4 sm:px-8 border-b border-zinc-900 bg-black/60 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center space-x-3">
                    <span className="text-xl font-bold tracking-tight text-white">colleKT</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                        3D
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    <WalletButton />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-5xl mx-auto space-y-8 my-auto">
                {/* Hero / Brand Section */}
                <div className="w-full max-w-md space-y-3 text-center">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">colleKT</h1>
                    <p className="text-base text-zinc-300 font-medium">3D Tezos NFT Gallery Experience</p>
                </div>

                {/* Universal Search Form */}
                <div className="w-full max-w-md">
                    <form onSubmit={handleSubmit} className="space-y-3" role="search" aria-label="Enter a gallery">
                        <div className="space-y-1.5">
                            <Label htmlFor="universal-gallery-input" className="sr-only">
                                Enter address, domain, objkt.com URL, or aleatory contract
                            </Label>
                            <Input
                                id="universal-gallery-input"
                                type="text"
                                placeholder="Address, .tez, objkt URL, or Aleatory generator"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="h-12 text-sm text-white bg-zinc-950 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? "input-error-message" : undefined}
                            />
                            {error && (
                                <p id="input-error-message" className="text-sm font-medium text-red-400" role="alert">
                                    {error}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="w-full min-h-[44px] text-sm font-semibold text-black bg-white hover:bg-zinc-200 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    <span>Resolving...</span>
                                </>
                            ) : (
                                <>
                                    <span>Enter 3D Gallery</span>
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Example Prompts */}
                    <div className="space-y-2 mt-6 text-center">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Examples:</p>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setInput("skllzrmy.tez")}
                                className="px-2.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-white transition-colors"
                            >
                                skllzrmy.tez
                            </button>
                            <button
                                type="button"
                                onClick={() => setInput("tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY")}
                                className="px-2.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-white transition-colors"
                            >
                                tz1Qi7...MbuY
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setInput(
                                        "https://objkt.com/curations/objkt/long-story-short-graphic-novel-by-swarleyart-b264a749"
                                    )
                                }
                                className="px-2.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-white transition-colors"
                            >
                                Objkt Curation
                            </button>
                            <button
                                type="button"
                                onClick={() => setInput("KT1VLVcGTw6UkwzMiPAn8SNcoMjicitQBGF6")}
                                className="px-2.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 focus-visible:ring-2 focus-visible:ring-white transition-colors"
                            >
                                Contract Collection
                            </button>
                        </div>
                    </div>
                </div>

                {/* Connected User Discovery Hub */}
                {address && (
                    <UserHub
                        address={address}
                        displayName={identity?.displayName || undefined}
                    />
                )}
            </main>

            {/* Accessible Footer */}
            <footer className="w-full text-center py-6 border-t border-zinc-900 bg-black mt-auto">
                <div className="space-y-1.5 text-xs text-zinc-400">
                    <div>
                        ©{" "}
                        {(() => {
                            const currentYear = new Date().getFullYear();
                            return currentYear > 2025 ? `2025-${currentYear}` : "2025";
                        })()}{" "}
                        FAFO <span className="line-through">lab</span>. All rights reserved. a{" "}
                        <a
                            href="https://fafolab.xyz"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-300 underline hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                        >
                            FAFO <span className="line-through">lab</span>
                        </a>{" "}
                        joint.
                    </div>
                    <div className="flex items-center justify-center space-x-4 pt-1">
                        <a
                            href="https://github.com/skullzarmy/colleKT"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-300 underline hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                        >
                            GitHub Repository
                        </a>
                        <span aria-hidden="true">•</span>
                        <span>
                            Data provided by{" "}
                            <a
                                href="https://tzkt.io"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-300 underline hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                            >
                                tzkt.io
                            </a>
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
