"use client";

import { useState, useEffect } from "react";

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
    console.log("🎣 HOOK CALLED: useTezosDomain", {
        walletAddress,
        length: walletAddress?.length,
        timestamp: new Date().toISOString(),
    });

    const [domain, setDomain] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("🔄 USEEFFECT TRIGGERED:", {
            walletAddress,
            hasWalletAddress: !!walletAddress,
            timestamp: new Date().toISOString(),
        });

        if (!walletAddress) {
            console.log("⚠️ NO WALLET ADDRESS - returning early");
            setDomain(null);
            return;
        }

        const fetchDomain = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Look for domains that point to this address and have reverse=true (primary domain)
                const apiUrl = `https://api.tzkt.io/v1/domains?address=${walletAddress}&reverse=true&limit=1`;

                console.log("🚀 DOMAIN FETCH START:", {
                    walletAddress,
                    walletAddressLength: walletAddress.length,
                    apiUrl,
                    timestamp: new Date().toISOString(),
                });

                const response = await fetch(apiUrl);

                console.log("📡 DOMAIN API RESPONSE:", {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch domain: ${response.status}`);
                }

                const domains: TezosDomain[] = await response.json();

                console.log("📊 DOMAIN API DATA:", {
                    rawResponse: domains,
                    domainsLength: domains.length,
                    firstDomain: domains[0],
                    domainNames: domains.map((d) => d.name),
                    reverseFlags: domains.map((d) => d.reverse),
                });

                if (domains.length > 0) {
                    console.log("✅ SETTING DOMAIN:", domains[0].name);
                    setDomain(domains[0].name);
                } else {
                    console.log("❌ NO DOMAINS FOUND - setting to null");
                    setDomain(null);
                }
            } catch (err) {
                console.log("💥 DOMAIN FETCH ERROR:", {
                    error: err,
                    errorMessage: err instanceof Error ? err.message : "Unknown error",
                    walletAddress,
                    stack: err instanceof Error ? err.stack : undefined,
                });
                setError(err instanceof Error ? err.message : "Unknown error");
                setDomain(null);
            } finally {
                console.log("🏁 DOMAIN FETCH COMPLETE:", {
                    walletAddress,
                    finalDomainState: domain,
                    isLoading: false,
                });
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
