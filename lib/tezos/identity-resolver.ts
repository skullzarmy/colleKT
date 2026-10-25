/**
 * Aleatory Standard for Wallet Identity Resolution
 *
 * Implements the resolution waterfall from aleatory (aleatory/src/lib/identity.ts):
 * 1. The Tezos Domains reverse record (.tez) - holder sets deliberately, points at wallet.
 * 2. The hack.tez subdomain the owner designated as their identity (*.hack.tez).
 * 3. TzKT profile alias.
 * 4. Objkt profile alias or handle.
 * 5. Fallback: formatted address (e.g., tz1...abcd).
 *
 * Features:
 * - 10-minute in-memory & sessionStorage cache
 * - Deduplication of in-flight promises
 * - Concurrency gating (max 6 concurrent lookups)
 */

const RESOLVER = process.env.NEXT_PUBLIC_HACKTEZ_API || "https://hacktez.com";
const TZKT_API = "https://api.tzkt.io";
const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";

const TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 4_000;

export type IdentitySource = "tezos-domains" | "hacktez" | "tzkt" | "objkt" | "address";

export interface ResolvedIdentity {
    displayName: string;
    source: IdentitySource;
    address: string;
    domain?: string | null;
    hackTezHandle?: string | null;
    tzktAlias?: string | null;
    objktAlias?: string | null;
    avatarUrl?: string | null;
    formattedAddress: string;
}

interface CachedIdentity extends ResolvedIdentity {
    cachedAt: number;
}

const memoryCache = new Map<string, CachedIdentity>();
const inflight = new Map<string, Promise<ResolvedIdentity>>();

const MAX_CONCURRENT = 6;
let active = 0;
const queue: (() => void)[] = [];

async function gate<T>(run: () => Promise<T>): Promise<T> {
    if (active >= MAX_CONCURRENT) {
        await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
        return await run();
    } finally {
        active--;
        queue.shift()?.();
    }
}

export function formatAddress(address: string): string {
    if (!address || address.length < 10) return address || "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function timedFetch(url: string, options?: RequestInit): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res.ok ? res : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function lookup(address: string): Promise<ResolvedIdentity> {
    const formatted = formatAddress(address);

    // 1. Primary query: hacktez resolver (CDN-cached .tez and hack.tez)
    let hackTezHandle: string | null = null;
    let tezosDomain: string | null = null;

    try {
        const res = await timedFetch(`${RESOLVER}/api/v1/resolve/${address}`);
        if (res) {
            const body = (await res.json().catch(() => null)) as {
                primary?: string | null;
                hackTezPrimary?: string | null;
                hackTez?: string[];
            } | null;

            hackTezHandle = body?.hackTezPrimary ?? body?.hackTez?.[0] ?? null;
            tezosDomain = body?.primary && body.primary !== hackTezHandle ? body.primary : null;

            // If .tez reverse record exists
            if (tezosDomain) {
                return {
                    displayName: tezosDomain,
                    source: "tezos-domains",
                    address,
                    domain: tezosDomain,
                    hackTezHandle,
                    formattedAddress: formatted,
                };
            }

            // If designated hack.tez domain exists
            if (hackTezHandle) {
                return {
                    displayName: hackTezHandle,
                    source: "hacktez",
                    address,
                    domain: null,
                    hackTezHandle,
                    formattedAddress: formatted,
                };
            }
        }
    } catch {
        // Continue to fallbacks
    }

    // 2. TzKT verified profile alias
    try {
        const res = await timedFetch(`${TZKT_API}/v1/accounts/${address}`);
        if (res) {
            const body = (await res.json().catch(() => null)) as { alias?: string } | null;
            if (body?.alias) {
                return {
                    displayName: body.alias,
                    source: "tzkt",
                    address,
                    tzktAlias: body.alias,
                    hackTezHandle,
                    formattedAddress: formatted,
                };
            }
        }
    } catch {
        // Continue to fallbacks
    }

    // 3. Objkt profile alias or handle
    try {
        const res = await timedFetch(OBJKT_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                query: `query Holder($a: String!) {
                    holder(where: { address: { _eq: $a } }) {
                        alias
                        logo
                    }
                }`,
                variables: { a: address },
            }),
        });
        if (res) {
            const body = (await res.json().catch(() => null)) as {
                data?: { holder?: Array<{ alias?: string | null; logo?: string | null }> };
            } | null;
            const holder = body?.data?.holder?.[0];
            if (holder?.alias) {
                return {
                    displayName: holder.alias,
                    source: "objkt",
                    address,
                    objktAlias: holder.alias,
                    avatarUrl: holder.logo || null,
                    hackTezHandle,
                    formattedAddress: formatted,
                };
            }
        }
    } catch {
        // Fallback
    }

    // 4. Default to formatted address
    return {
        displayName: formatted,
        source: "address",
        address,
        formattedAddress: formatted,
    };
}

/**
 * Resolves an address through the Aleatory identity waterfall.
 * Cached for 10 minutes in memory and sessionStorage.
 */
export async function resolveIdentity(address: string): Promise<ResolvedIdentity> {
    if (!address) {
        return {
            displayName: "",
            source: "address",
            address: "",
            formattedAddress: "",
        };
    }

    // Check memory cache
    const memHit = memoryCache.get(address);
    if (memHit && Date.now() - memHit.cachedAt < TTL_MS) {
        return memHit;
    }

    // Check sessionStorage if in browser
    if (typeof window !== "undefined") {
        try {
            const raw = sessionStorage.getItem(`collekt:id:${address}`);
            if (raw) {
                const parsed = JSON.parse(raw) as CachedIdentity;
                if (Date.now() - parsed.cachedAt < TTL_MS) {
                    memoryCache.set(address, parsed);
                    return parsed;
                }
            }
        } catch {
            // Storage unavailable
        }
    }

    // Deduplicate in-flight requests
    const pending = inflight.get(address);
    if (pending) return pending;

    const promise = gate(() => lookup(address))
        .then((result) => {
            const cached: CachedIdentity = { ...result, cachedAt: Date.now() };
            memoryCache.set(address, cached);
            if (typeof window !== "undefined") {
                try {
                    sessionStorage.setItem(`collekt:id:${address}`, JSON.stringify(cached));
                } catch {
                    // Ignore quota errors
                }
            }
            return result;
        })
        .finally(() => inflight.delete(address));

    inflight.set(address, promise);
    return promise;
}
