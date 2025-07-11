"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseInput } from "@/lib/data/utils/input-parser";
import { ParsedInput } from "@/lib/data/types/gallery-types";

export default function HomePage() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

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

            // Route based on parsed result
            router.push(result.route);
        } catch (error) {
            setError("Failed to parse input");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 text-white bg-black">
            <div className="w-full max-w-md space-y-8">
                {/* Logo and Title */}
                <div className="space-y-2 text-center">
                    <h1 className="text-4xl font-bold">colleKT</h1>
                    <p className="text-gray-400">3D Tezos NFT Gallery</p>
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Enter address, domain, or objkt.com URL"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="text-white bg-black border-gray-700 placeholder:text-gray-500 focus:border-white"
                        />
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>

                    <Button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-full text-black bg-white hover:bg-gray-200 disabled:opacity-50"
                    >
                        {isLoading ? "Resolving..." : "Enter Gallery"}
                    </Button>
                </form>

                {/* Examples */}
                <div className="space-y-2 text-center">
                    <p className="text-sm text-gray-500">Examples:</p>
                    <div className="space-y-1 text-sm">
                        <button
                            onClick={() => setInput("skllzrmy.tez")}
                            className="block text-gray-400 underline hover:text-white"
                        >
                            skllzrmy.tez
                        </button>
                        <button
                            onClick={() => setInput("tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY")}
                            className="block text-gray-400 underline hover:text-white"
                        >
                            tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY
                        </button>
                        <button
                            onClick={() =>
                                setInput(
                                    "https://objkt.com/curations/objkt/long-story-short-graphic-novel-by-swarleyart-b264a749"
                                )
                            }
                            className="block text-gray-400 underline hover:text-white"
                        >
                            objkt.com curation (b264a749)
                        </button>
                        <button
                            onClick={() => setInput("b264a749-2674-4baa-bc7c-b5ed8bafe54a")}
                            className="block text-gray-400 underline hover:text-white"
                        >
                            Curation ID (gallery_id)
                        </button>
                        <button
                            onClick={() =>
                                setInput("https://objkt.com/collections/KT1VLVcGTw6UkwzMiPAn8SNcoMjicitQBGF6")
                            }
                            className="block text-gray-400 underline hover:text-white"
                        >
                            objkt.com collection
                        </button>
                        <button
                            onClick={() => setInput("KT1VLVcGTw6UkwzMiPAn8SNcoMjicitQBGF6")}
                            className="block text-gray-400 underline hover:text-white"
                        >
                            Collection contract
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute left-0 right-0 text-center bottom-4">
                <div className="space-y-1 text-xs text-gray-500">
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
                            className="text-gray-400 underline hover:text-white"
                        >
                            FAFO <span className="line-through">lab</span>
                        </a>{" "}
                        joint.
                    </div>
                    <div>
                        Data provided by{" "}
                        <a
                            href="https://tzkt.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 underline hover:text-white"
                        >
                            tzkt.io
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
