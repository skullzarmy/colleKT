/**
 * User Discovery Service
 *
 * Discovers collections and curations associated with a Tezos account:
 * 1. Strict Art Contract Filtering:
 *    - Must be FA2 / tzip-12 or ALEATORY-001 (excludes generic smart contracts/multisigs)
 *    - Must have 0 decimals (strictly excludes fungible coins, DAO tokens, and DeFi assets)
 *    - Must have tokensCount > 0
 * 2. FA collections and contract galleries (via Objkt GraphQL API) - reveals collection names, logos, descriptions, and token preview thumbnails
 * 3. User curations (via Objkt GraphQL API) - queries gallery with curators filter, pulling titles, logos, descriptions, and item tokens
 */

export interface PreviewToken {
    tokenId: string;
    name?: string;
    displayUri?: string;
    thumbnailUri?: string;
}

export interface DiscoveredCollection {
    address: string;
    name: string;
    alias?: string;
    description?: string;
    logo?: string;
    isAleatory: boolean;
    tokensCount?: number;
    tzips?: string[];
    createdAt?: string;
    previewTokens?: PreviewToken[];
}

export interface DiscoveredCuration {
    id: string;
    slug: string;
    name: string;
    description?: string;
    logo?: string;
    itemsCount: number;
    published: boolean;
    previewTokens?: PreviewToken[];
}

const TZKT_API = "https://api.tzkt.io";
const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";

export function formatIpfsUrl(uri?: string | null): string | undefined {
    if (!uri) return undefined;
    if (uri.startsWith("ipfs://")) {
        return `https://ipfs.fileship.xyz/${uri.replace("ipfs://", "")}`;
    }
    return uri;
}

/**
 * Fetch all verified NFT art collections originated or curated by an address.
 * Strictly excludes contracts with decimals > 0 (DAO tokens, coins, fungibles) and non-asset contracts.
 */
export async function fetchUserCollections(address: string): Promise<DiscoveredCollection[]> {
    if (!address) return [];

    try {
        // Query TzKT contracts and Objkt fa/gallery with strict art/NFT filters in parallel
        const [tzktRes, objktRes] = await Promise.allSettled([
            fetch(`${TZKT_API}/v1/contracts?creator=${address}&limit=50&sort.desc=firstActivity`, {
                next: { revalidate: 60 },
            }),
            fetch(OBJKT_GRAPHQL, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    query: `
                        query GetCreatorCollections($address: String!) {
                            fa(
                                where: {
                                    creator_address: { _eq: $address }
                                    items: { _gt: 0 }
                                    _not: { tokens: { decimals: { _gt: 0 } } }
                                }
                                order_by: { items: desc }
                                limit: 50
                            ) {
                                contract
                                name
                                description
                                logo
                                items
                                tokens(limit: 4) {
                                    token_id
                                    name
                                    display_uri
                                    thumbnail_uri
                                    decimals
                                }
                            }
                            contractGalleries: gallery(
                                where: {
                                    curators: { curator_address: { _eq: $address } }
                                    gallery_id: { _like: "KT1%" }
                                    items: { _gt: 0 }
                                }
                                order_by: { inserted_at: desc }
                                limit: 50
                            ) {
                                gallery_id
                                slug
                                name
                                description
                                logo
                                items
                                tokens(limit: 4) {
                                    token {
                                        token_id
                                        name
                                        display_uri
                                        thumbnail_uri
                                        decimals
                                    }
                                }
                            }
                        }
                    `,
                    variables: { address },
                }),
                next: { revalidate: 60 },
            }),
        ]);

        // Map of verified art metadata from Objkt
        const enrichedMap = new Map<
            string,
            {
                name?: string;
                description?: string;
                logo?: string;
                items?: number;
                previewTokens?: PreviewToken[];
                hasDecimals: boolean;
            }
        >();

        if (objktRes.status === "fulfilled" && objktRes.value.ok) {
            try {
                const objktData = (await objktRes.value.json()) as {
                    data?: {
                        fa?: Array<{
                            contract: string;
                            name?: string;
                            description?: string;
                            logo?: string;
                            items?: number;
                            tokens?: Array<{
                                token_id: string;
                                name?: string;
                                display_uri?: string;
                                thumbnail_uri?: string;
                                decimals?: number;
                            }>;
                        }>;
                        contractGalleries?: Array<{
                            gallery_id: string;
                            slug?: string;
                            name?: string;
                            description?: string;
                            logo?: string;
                            items?: number;
                            tokens?: Array<{
                                token?: {
                                    token_id: string;
                                    name?: string;
                                    display_uri?: string;
                                    thumbnail_uri?: string;
                                    decimals?: number;
                                };
                            }>;
                        }>;
                    };
                };

                // Add FA collections (strict check: decimals must not be > 0)
                (objktData.data?.fa || []).forEach((item) => {
                    if (!item.contract) return;
                    const hasDecimals = (item.tokens || []).some(
                        (t) => t.decimals !== undefined && t.decimals !== null && t.decimals > 0
                    );

                    if (!hasDecimals) {
                        enrichedMap.set(item.contract, {
                            name: item.name,
                            description: item.description,
                            logo: formatIpfsUrl(item.logo),
                            items: item.items,
                            hasDecimals: false,
                            previewTokens: (item.tokens || []).map((t) => ({
                                tokenId: t.token_id,
                                name: t.name,
                                displayUri: formatIpfsUrl(t.display_uri),
                                thumbnailUri: formatIpfsUrl(t.thumbnail_uri || t.display_uri),
                            })),
                        });
                    } else {
                        enrichedMap.set(item.contract, { hasDecimals: true });
                    }
                });

                // Add / override with Contract Galleries (e.g. Flowers for Piero)
                (objktData.data?.contractGalleries || []).forEach((item) => {
                    if (!item.gallery_id || !item.gallery_id.startsWith("KT1")) return;
                    const hasDecimals = (item.tokens || []).some(
                        (t) =>
                            t.token?.decimals !== undefined &&
                            t.token?.decimals !== null &&
                            t.token.decimals > 0
                    );

                    if (!hasDecimals) {
                        enrichedMap.set(item.gallery_id, {
                            name: item.name,
                            description: item.description,
                            logo: formatIpfsUrl(item.logo),
                            items: item.items,
                            hasDecimals: false,
                            previewTokens: (item.tokens || []).map((t) => ({
                                tokenId: t.token?.token_id || "",
                                name: t.token?.name,
                                displayUri: formatIpfsUrl(t.token?.display_uri),
                                thumbnailUri: formatIpfsUrl(t.token?.thumbnail_uri || t.token?.display_uri),
                            })),
                        });
                    } else {
                        enrichedMap.set(item.gallery_id, { hasDecimals: true });
                    }
                });
            } catch (err) {
                console.warn("[UserDiscovery] Failed to parse Objkt collections response:", err);
            }
        }

        // Process TzKT contracts with strict art-only validation
        const collections: DiscoveredCollection[] = [];
        const seenAddresses = new Set<string>();

        if (tzktRes.status === "fulfilled" && tzktRes.value.ok) {
            try {
                const tzktContracts = (await tzktRes.value.json()) as Array<{
                    address?: string;
                    alias?: string;
                    kind?: string;
                    tzips?: string[];
                    tokensCount?: number;
                    firstActivityTime?: string;
                    metadata?: {
                        name?: string;
                        description?: string;
                        interfaces?: string[];
                    };
                }>;

                for (const c of tzktContracts) {
                    if (!c.address) continue;

                    // 1. Must be an asset contract, NOT a generic smart_contract (multisigs, pools, etc.)
                    if (c.kind !== "asset") continue;

                    // 2. Must have actual tokens (> 0)
                    if (!c.tokensCount || c.tokensCount <= 0) continue;

                    // 3. Must support FA2 / tzip-12 or ALEATORY-001 standard
                    const tzips = c.tzips || [];
                    const interfaces = c.metadata?.interfaces || [];
                    const isAleatory =
                        interfaces.includes("ALEATORY-001") ||
                        (c.alias?.toLowerCase().includes("aleatory") ?? false);

                    const isFA2 = tzips.includes("fa2") || tzips.includes("tzip-12");
                    if (!isFA2 && !isAleatory) continue;

                    // 4. Must NOT have decimals > 0 (DAO coins, fungibles)
                    const enriched = enrichedMap.get(c.address);
                    if (enriched?.hasDecimals) continue;

                    // 5. Exclude obvious fungible/coin aliases from display
                    const aliasLower = (c.alias || "").toLowerCase();
                    if (aliasLower.includes("coin") || aliasLower.includes("dao")) continue;

                    seenAddresses.add(c.address);

                    const finalName =
                        enriched?.name ||
                        c.metadata?.name ||
                        c.alias ||
                        `Collection ${c.address.slice(0, 8)}...${c.address.slice(-4)}`;

                    collections.push({
                        address: c.address,
                        name: finalName,
                        alias: c.alias,
                        description: enriched?.description || c.metadata?.description,
                        logo: enriched?.logo,
                        isAleatory:
                            isAleatory ||
                            (enriched?.name?.toLowerCase().includes("aleatory") ?? false),
                        tokensCount:
                            enriched?.items !== undefined ? enriched.items : (c.tokensCount || 0),
                        tzips: c.tzips || [],
                        createdAt: c.firstActivityTime,
                        previewTokens: enriched?.previewTokens,
                    });
                }
            } catch (err) {
                console.warn("[UserDiscovery] Failed to parse TzKT contracts:", err);
            }
        }

        // Also add any Objkt FA collections not originated directly by creator address (e.g. factory/marketplace created)
        enrichedMap.forEach((enriched, contract) => {
            if (!seenAddresses.has(contract) && !enriched.hasDecimals && (enriched.items || 0) > 0) {
                seenAddresses.add(contract);
                collections.push({
                    address: contract,
                    name: enriched.name || `Collection ${contract.slice(0, 8)}`,
                    description: enriched.description,
                    logo: enriched.logo,
                    isAleatory: enriched.name?.toLowerCase().includes("aleatory") ?? false,
                    tokensCount: enriched.items || 0,
                    previewTokens: enriched.previewTokens,
                });
            }
        });

        return collections;
    } catch (error) {
        console.error("[UserDiscovery] Failed to fetch user collections:", error);
        return [];
    }
}

/**
 * Fetch curations / galleries created by the user from Objkt GraphQL
 */
export async function fetchUserCurations(address: string): Promise<DiscoveredCuration[]> {
    if (!address) return [];

    const query = `
        query GetUserCurations($address: String!) {
            gallery(
                where: {
                    curators: { curator_address: { _eq: $address } }
                    _not: { gallery_id: { _like: "KT1%" } }
                    items: { _gt: 0 }
                }
                order_by: { inserted_at: desc }
                limit: 50
            ) {
                gallery_id
                slug
                name
                description
                logo
                items
                published
                tokens(limit: 4) {
                    token {
                        token_id
                        name
                        display_uri
                        thumbnail_uri
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch(OBJKT_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { address },
            }),
            next: { revalidate: 60 },
        });

        if (!response.ok) return [];

        const body = (await response.json()) as {
            data?: {
                gallery?: Array<{
                    gallery_id: string;
                    slug?: string;
                    name?: string;
                    description?: string;
                    logo?: string;
                    items?: number;
                    published?: boolean;
                    tokens?: Array<{
                        token?: {
                            token_id: string;
                            name?: string;
                            display_uri?: string;
                            thumbnail_uri?: string;
                        };
                    }>;
                }>;
            };
        };

        const galleries = body.data?.gallery || [];

        return galleries.map((g) => ({
            id: g.gallery_id,
            slug: g.slug || g.gallery_id,
            name: g.name || `Curation #${g.slug || g.gallery_id.slice(0, 8)}`,
            description: g.description,
            logo: formatIpfsUrl(g.logo),
            itemsCount: g.items || 0,
            published: g.published ?? true,
            previewTokens: (g.tokens || []).map((t) => ({
                tokenId: t.token?.token_id || "",
                name: t.token?.name,
                displayUri: formatIpfsUrl(t.token?.display_uri),
                thumbnailUri: formatIpfsUrl(t.token?.thumbnail_uri || t.token?.display_uri),
            })),
        }));
    } catch (error) {
        console.error("[UserDiscovery] Failed to fetch user curations from Objkt:", error);
        return [];
    }
}
