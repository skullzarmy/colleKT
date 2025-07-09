"use client";

import { useState, useEffect } from "react";
import { tzktSdkClient } from "@/lib/data/sources/tzkt-sdk-client";

interface TezosDomain {
    name: string;
    owner: {
        address: string;
    };
    address: {
        address: string;
    };
    reverse: boolean;
}

export function useTezosDomain(walletAddress: string) {
    const [domain, setDomain] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!walletAddress) {
            setDomain(null);
            return;
        }

        const fetchDomain = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Use TzKT SDK client for domain lookup
                const domains = await tzktSdkClient.getDomainsByAddress(walletAddress, true, 1);

                if (domains.length > 0 && domains[0].name) {
                    setDomain(domains[0].name);
                } else {
                    setDomain(null);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                setDomain(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDomain();
    }, [walletAddress]);

    return {
        domain,
        isLoading,
        error,
        displayName: domain || `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`,
    };
}
