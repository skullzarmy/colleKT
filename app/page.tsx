"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomePage() {
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const resolveDomainToAddress = async (domain: string): Promise<string | null> => {
        try {
            // Check if it's already a wallet address
            if (
                domain.startsWith("tz1") ||
                domain.startsWith("tz2") ||
                domain.startsWith("tz3") ||
                domain.startsWith("KT1")
            ) {
                return domain;
            }

            // Try to resolve as domain
            const response = await fetch(`https://api.tzkt.io/v1/domains?name=${domain}&limit=1`);
            if (!response.ok) return null;

            const domains = await response.json();
            if (domains.length > 0 && domains[0].address) {
                return domains[0].address.address;
            }

            return null;
        } catch {
            return null;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setIsLoading(true);
        setError("");

        try {
            const cleanInput = input.trim();
            const resolvedAddress = await resolveDomainToAddress(cleanInput);

            if (!resolvedAddress) {
                setError("Invalid address or domain name");
                setIsLoading(false);
                return;
            }

            router.push(`/gallery/${resolvedAddress}`);
        } catch {
            setError("Failed to resolve address");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 text-white bg-black">
            <div className="w-full max-w-md space-y-8">
                {/* Logo and Title */}
                <div className="space-y-2 text-center">
                    <h1 className="text-4xl font-bold">COLLKT</h1>
                    <p className="text-gray-400">Tezos NFT Gallery</p>
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Enter wallet address or domain name"
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
                    </div>
                </div>
            </div>
        </div>
    );
}
