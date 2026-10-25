/**
 * User Discovery Service
 *
 * Discovers collections and curations associated with a Tezos account:
 * 1. Originated contracts (via TzKT API) - reveals collections and ALEATORY-001 generators
 * 2. Curated galleries (via Objkt.com GraphQL API)
 */

export interface DiscoveredCollection {
    address: string;
    name: string;
    alias?: string;
    description?: string;
    isAleatory: boolean;
    tokensCount?: number;
    tzips?: string[];
    createdAt?: string;
}

export interface DiscoveredCuration {
    id: string;
    slug: string;
    name: string;
    description?: string;
    logo?: string;
    itemsCount: number;
    published: boolean;
}

const TZKT_API = "https://api.tzkt.io";
const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";

/**
 * Fetch all contracts originated by a creator address
 */
export async function fetchUserCollections(address: string): Promise<DiscoveredCollection[]> {
    if (!address) return [];

    try {
        const response = await fetch(
            `${TZKT_API}/v1/contracts?creator=${address}&limit=50&sort.desc=firstActivity`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) return [];

        const contracts = (await response.json()) as Array<{
            address?: string;
            alias?: string;
            tzips?: string[];
            tokensCount?: number;
            firstActivityTime?: string;
            metadata?: {
                name?: string;
                description?: string;
                interfaces?: string[];
            };
        }>;

        return contracts
            .filter((c) => Boolean(c.address))
            .map((c) => {
                const interfaces = c.metadata?.interfaces || [];
                const isAleatory =
                    interfaces.includes("ALEATORY-001") ||
                    (c.alias?.toLowerCase().includes("aleatory") ?? false);

                return {
                    address: c.address!,
                    name: c.metadata?.name || c.alias || `Collection ${c.address!.slice(0, 8)}`,
                    alias: c.alias,
                    description: c.metadata?.description,
                    isAleatory,
                    tokensCount: c.tokensCount || 0,
                    tzips: c.tzips || [],
                    createdAt: c.firstActivityTime,
                };
            });
    } catch (error) {
        console.error("Failed to fetch user collections from TzKT:", error);
        return [];
    }
}

/**
 * Fetch curations/galleries created by the user from Objkt GraphQL
 */
export async function fetchUserCurations(address: string): Promise<DiscoveredCuration[]> {
    if (!address) return [];

    const query = `
        query GetUserCurations($address: String!) {
            gallery(
                where: { curator: { address: { _eq: $address } } }
                order_by: { inserted_at: desc }
            ) {
                id
                slug
                name
                description
                logo
                items
                published
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
                    id: number | string;
                    slug: string;
                    name: string;
                    description?: string;
                    logo?: string;
                    items?: number;
                    published?: boolean;
                }>;
            };
        };

        const galleries = body.data?.gallery || [];

        return galleries.map((g) => ({
            id: String(g.id),
            slug: g.slug || String(g.id),
            name: g.name || `Curation #${g.id}`,
            description: g.description,
            logo: g.logo,
            itemsCount: g.items || 0,
            published: g.published ?? true,
        }));
    } catch (error) {
        console.error("Failed to fetch user curations from Objkt:", error);
        return [];
    }
}
