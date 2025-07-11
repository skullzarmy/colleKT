/**
 * objkt-queries.ts - Lightweight objkt.com Queries with TzKT Bridge
 *
 * This module implements the objkt.com → TzKT bridge pattern:
 * 1. Query objkt.com for curation token IDs (lightweight)
 * 2. Bridge to TzKT for detailed token data (consistent format)
 * 3. Query objkt.com for curation metadata (display info)
 *
 * This approach ensures data consistency with existing USER galleries
 * while leveraging objkt.com's curation data.
 */

import { objktClient } from "./objkt-client";
import { UnifiedToken, UnifiedMetadata, TokenStandard, DataSource } from "../types/token-types";

/**
 * Token identifier from objkt.com queries
 */
export interface TokenIdentifier {
    fa_contract: string;
    token_id: string;
}

/**
 * Curation metadata from objkt.com
 */
export interface CurationInfo {
    id: string;
    name: string;
    description: string;
    slug: string;
    totalItems: number;
    coverUri?: string; // Use logo field instead
    logo?: string;
    items?: number;
    maxItems?: number;
    owners?: number;
    floorPrice?: string;
    volume24h?: string;
    volumeTotal?: string;
    published?: boolean;
    insertedAt?: string;
    updatedAt?: string;
}

/**
 * GraphQL queries for objkt.com API
 */

/**
 * Lightweight query to extract token IDs from a curation by slug
 * Only gets the essential identifiers, not full metadata
 * Fixed: Use slug field as confirmed by working query
 */
const CURATION_TOKEN_IDS_BY_SLUG_QUERY = `
  query GetCurationTokenIdsBySlug($slug: String!) {
    gallery_token(
      where: {
        gallery: {
          slug: {_eq: $slug}
        }
      }
    ) {
      token {
        fa_contract
        token_id
      }
    }
  }
`;

/**
 * Query to extract token IDs from a curation by gallery_id
 * Fixed: Use gallery_id field for UUID-based lookups
 */
const CURATION_TOKEN_IDS_BY_GALLERY_ID_QUERY = `
  query GetCurationTokenIdsByGalleryId($gallery_id: String!) {
    gallery_token(
      where: {
        gallery: {
          gallery_id: {_eq: $gallery_id}
        }
      }
    ) {
      token {
        fa_contract
        token_id
      }
    }
  }
`;

/**
 * Query to get curation metadata by slug
 * Fixed: Remove invalid gallery_token_aggregate - use items field instead
 */
const CURATION_METADATA_BY_SLUG_QUERY = `
  query GetCurationMetadataBySlug($slug: String!) {
    gallery(
      where: {
        slug: {_eq: $slug}
      }
    ) {
      gallery_id
      name
      description
      slug
      logo
      items
      max_items
      owners
      floor_price
      volume_24h
      volume_total
      published
      inserted_at
      updated_at
    }
  }
`;

/**
 * Query to get curation metadata by gallery_id
 * Fixed: Remove invalid gallery_token_aggregate - use items field instead
 */
const CURATION_METADATA_BY_GALLERY_ID_QUERY = `
  query GetCurationMetadataByGalleryId($gallery_id: String!) {
    gallery(
      where: {
        gallery_id: {_eq: $gallery_id}
      }
    ) {
      gallery_id
      name
      description
      slug
      logo
      items
      max_items
      owners
      floor_price
      volume_24h
      volume_total
      published
      inserted_at
      updated_at
    }
  }
`;

/**
 * Main objkt-queries class
 */
export class ObjktQueries {
    /**
     * Extract token identifiers from objkt.com curation
     * Step 1 of the objkt → TzKT bridge
     * Fixed: Handle slug vs gallery_id properly (no numeric IDs)
     */
    async extractCurationTokenIds(curationId: string): Promise<TokenIdentifier[]> {
        try {
            // Determine if this is a short slug (8 chars) or full gallery_id (UUID)
            const isSlug = /^[a-f0-9]{8}$/.test(curationId);

            let response;
            if (isSlug) {
                // Use slug for 8-character hex identifiers
                response = await objktClient.query(
                    CURATION_TOKEN_IDS_BY_SLUG_QUERY,
                    { slug: curationId },
                    "ExtractCurationTokenIdsBySlug"
                );
            } else {
                // Use gallery_id for full UUID identifiers
                response = await objktClient.query(
                    CURATION_TOKEN_IDS_BY_GALLERY_ID_QUERY,
                    { gallery_id: curationId },
                    "ExtractCurationTokenIdsByGalleryId"
                );
            }

            if (!response.data?.gallery_token) {
                throw new Error(`No gallery_token data found for curation ${curationId}`);
            }

            const tokenIds: TokenIdentifier[] = response.data.gallery_token.map((item: any) => ({
                fa_contract: item.token.fa_contract,
                token_id: item.token.token_id,
            }));

            console.log(
                `📊 Extracted ${tokenIds.length} token IDs from curation ${curationId} (${
                    isSlug ? "slug" : "gallery_id"
                })`
            );
            return tokenIds;
        } catch (error) {
            console.error(`❌ Failed to extract curation token IDs:`, error);
            throw new Error(
                `Failed to extract token IDs for curation ${curationId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Bridge to TzKT for detailed token data
     * Step 2 of the objkt → TzKT bridge - gets consistent UnifiedToken format
     */
    async fetchCurationTokensViaTzKT(tokenIds: TokenIdentifier[]): Promise<UnifiedToken[]> {
        if (tokenIds.length === 0) {
            console.log("📊 No token IDs to fetch");
            return [];
        }

        try {
            console.log(`📊 Fetching ${tokenIds.length} tokens from TzKT using batch contract method...`);

            // Group tokens by contract for efficient batch fetching
            const tokensByContract = new Map<string, string[]>();

            for (const { fa_contract, token_id } of tokenIds) {
                if (!tokensByContract.has(fa_contract)) {
                    tokensByContract.set(fa_contract, []);
                }
                tokensByContract.get(fa_contract)!.push(token_id);
            }

            console.log(`📊 Grouped into ${tokensByContract.size} contracts for batch fetching`);

            // Fetch tokens for each contract using the working data orchestrator pattern
            const allTokens: UnifiedToken[] = [];

            for (const [contractAddress, tokenIdList] of tokensByContract) {
                try {
                    console.log(`🔄 Fetching contract ${contractAddress} (need ${tokenIdList.length} specific tokens)`);

                    // Use TzKT tokens endpoint with contract filter (like data orchestrator)
                    const url = new URL("https://api.tzkt.io/v1/tokens");
                    url.searchParams.set("contract", contractAddress);
                    url.searchParams.set("limit", "10000"); // Get all tokens for this contract

                    const response = await fetch(url.toString(), {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            "User-Agent": "colleKT/1.0",
                        },
                        signal: AbortSignal.timeout(60000), // 60 second timeout for batch
                    });

                    if (!response.ok) {
                        console.warn(
                            `⚠️ Failed to fetch tokens for contract ${contractAddress}: ${response.status} ${response.statusText}`
                        );
                        continue;
                    }

                    const contractTokens = await response.json();

                    // Filter to only the tokens we need from this contract
                    const filteredTokens = contractTokens.filter((token: any) =>
                        tokenIdList.includes(token.tokenId?.toString())
                    );

                    console.log(
                        `📊 Found ${filteredTokens.length}/${tokenIdList.length} requested tokens in contract ${contractAddress}`
                    );

                    // Convert to UnifiedToken format using existing method
                    const convertedTokens = filteredTokens
                        .map((tzktToken: any) => {
                            try {
                                return this.convertTzKTTokenToUnified(tzktToken);
                            } catch (error) {
                                console.error(
                                    `❌ ERROR converting token ${contractAddress}:${tzktToken.tokenId}:`,
                                    error
                                );
                                return null;
                            }
                        })
                        .filter((token: UnifiedToken | null): token is UnifiedToken => token !== null);

                    allTokens.push(...convertedTokens);
                    console.log(
                        `✅ Successfully converted ${convertedTokens.length} tokens from contract ${contractAddress}`
                    );
                } catch (error) {
                    console.error(`❌ Failed to fetch tokens for contract ${contractAddress}:`, error);
                    continue;
                }
            }

            const successCount = allTokens.length;
            const totalCount = tokenIds.length;

            console.log(`📊 Batch fetch complete: ${successCount}/${totalCount} tokens retrieved`);

            if (successCount < totalCount) {
                console.warn(`⚠️ ${totalCount - successCount} tokens missing (may not exist on TzKT)`);
            }

            return allTokens;
        } catch (error) {
            console.error(`❌ Failed to fetch curation tokens via TzKT bridge:`, error);
            throw new Error(
                `Failed to fetch tokens via TzKT bridge: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Get curation metadata for display purposes
     * Step 3 of the objkt → TzKT bridge - gets display information
     * Fixed: Handle slug vs gallery_id properly (no numeric IDs)
     */
    async getCurationMetadata(curationId: string): Promise<CurationInfo> {
        try {
            // Determine if this is a short slug (8 chars) or full gallery_id (UUID)
            const isSlug = /^[a-f0-9]{8}$/.test(curationId);

            let response;
            if (isSlug) {
                // Use slug for 8-character hex identifiers
                response = await objktClient.query(
                    CURATION_METADATA_BY_SLUG_QUERY,
                    { slug: curationId },
                    "GetCurationMetadataBySlug"
                );
            } else {
                // Use gallery_id for full UUID identifiers
                response = await objktClient.query(
                    CURATION_METADATA_BY_GALLERY_ID_QUERY,
                    { gallery_id: curationId },
                    "GetCurationMetadataByGalleryId"
                );
            }

            if (!response.data?.gallery || response.data.gallery.length === 0) {
                throw new Error(`Curation ${curationId} not found`);
            }

            const gallery = response.data.gallery[0];
            const totalItems = gallery.items || 0; // Use items field directly

            return {
                id: gallery.gallery_id,
                name: gallery.name,
                description: gallery.description || "",
                slug: gallery.slug,
                totalItems,
                coverUri: gallery.logo, // Use logo as cover image
                logo: gallery.logo,
                items: gallery.items,
                maxItems: gallery.max_items,
                owners: gallery.owners,
                floorPrice: gallery.floor_price,
                volume24h: gallery.volume_24h,
                volumeTotal: gallery.volume_total,
                published: gallery.published,
                insertedAt: gallery.inserted_at,
                updatedAt: gallery.updated_at,
            };
        } catch (error) {
            console.error(`❌ Failed to get curation metadata:`, error);
            throw new Error(
                `Failed to get curation metadata for ${curationId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Complete objkt → TzKT bridge workflow
     * Combines all steps for easy consumption by data orchestrator
     */
    async fetchCurationTokensComplete(curationId: string): Promise<{
        tokens: UnifiedToken[];
        metadata: CurationInfo;
    }> {
        try {
            // Step 1: Extract token IDs from objkt.com
            const tokenIds = await this.extractCurationTokenIds(curationId);

            // Step 2: Fetch detailed token data from TzKT
            const tokens = await this.fetchCurationTokensViaTzKT(tokenIds);

            // Step 3: Get curation metadata from objkt.com
            const metadata = await this.getCurationMetadata(curationId);

            return { tokens, metadata };
        } catch (error) {
            console.error(`❌ Complete curation fetch failed:`, error);
            throw error;
        }
    }

    /**
     * Direct TzKT collection fetch for contract-based collections
     * This bypasses objkt.com entirely for COLLECTION galleries
     * Fixed: Filter out burned tokens by using balances endpoint
     */
    async fetchCollectionTokensViaTzKT(contractAddress: string): Promise<UnifiedToken[]> {
        try {
            // Use tokens/balances endpoint to get active tokens only (excludes burned)
            const url = new URL("https://api.tzkt.io/v1/tokens/balances");
            url.searchParams.set("token.contract", contractAddress);
            url.searchParams.set("balance.gt", "0"); // Only tokens with balance > 0
            url.searchParams.set("limit", "10000"); // Max limit to get everything

            console.log(`📊 Fetching collection ${contractAddress} with burn filtering...`);

            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "User-Agent": "colleKT/1.0",
                },
                signal: AbortSignal.timeout(120000), // 2 minutes timeout
            });

            if (!response.ok) {
                throw new Error(`TzKT collection API request failed: ${response.status} ${response.statusText}`);
            }

            const balances = await response.json();

            // Group balances by token and sum them to identify active tokens
            const tokenBalanceMap = new Map<string, { total: number; token: any }>();

            // Known burn addresses to exclude
            const burnAddresses = new Set([
                "tz1burnburnburnburnburnburnburjAYjjX", // Standard burn address
                "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU", // Another common burn address
            ]);

            for (const balance of balances) {
                const tokenId = balance.token?.tokenId;
                const accountAddress = balance.account?.address;

                if (!tokenId || !accountAddress) continue;

                const balanceAmount = parseInt(balance.balance || "0");
                if (balanceAmount === 0) continue; // Skip zero balances

                // Skip balances held by burn addresses
                if (burnAddresses.has(accountAddress)) {
                    console.log(`🔥 Skipping burned token ${tokenId} held by burn address ${accountAddress}`);
                    continue;
                }

                if (!tokenBalanceMap.has(tokenId)) {
                    tokenBalanceMap.set(tokenId, { total: 0, token: balance.token });
                }
                tokenBalanceMap.get(tokenId)!.total += balanceAmount;
            }

            console.log(`📊 Found ${tokenBalanceMap.size} active tokens (with non-zero balances)`);

            // Convert active tokens to UnifiedToken format
            const activeTokens: UnifiedToken[] = [];

            for (const [tokenId, { total, token }] of tokenBalanceMap) {
                try {
                    // Only include tokens that have actual circulating supply
                    if (total > 0) {
                        const unifiedToken = this.convertTzKTTokenToUnified(token);
                        activeTokens.push(unifiedToken);
                    }
                } catch (error) {
                    console.error(`❌ ERROR converting collection token ${contractAddress}:${tokenId}:`, error);
                    continue;
                }
            }

            console.log(
                `📊 Successfully converted ${activeTokens.length} active tokens from collection ${contractAddress}`
            );
            return activeTokens;
        } catch (error) {
            console.error("❌ Failed to fetch collection tokens from TzKT:", error);
            throw error;
        }
    }

    /**
     * Convert TzKT token format to UnifiedToken (consistent with data orchestrator)
     */
    private convertTzKTTokenToUnified(tzktToken: any): UnifiedToken {
        const metadata: UnifiedMetadata = {
            name: tzktToken?.metadata?.name || undefined,
            symbol: tzktToken?.metadata?.symbol || undefined,
            decimals: tzktToken?.metadata?.decimals ? Number(tzktToken.metadata.decimals) : undefined,
            description: tzktToken?.metadata?.description || undefined,
            image: tzktToken?.metadata?.image || undefined,
            artifactUri: tzktToken?.metadata?.artifactUri || undefined,
            displayUri: tzktToken?.metadata?.displayUri || undefined,
            thumbnailUri: tzktToken?.metadata?.thumbnailUri || undefined,
            supply: tzktToken?.totalSupply || tzktToken?.metadata?.supply || undefined,
            creators: tzktToken?.metadata?.creators || undefined,
            attributes: tzktToken?.metadata?.attributes || undefined,
            formats: tzktToken?.metadata?.formats || undefined,
            raw: tzktToken?.metadata || undefined,
        };

        // Determine token standard
        let standard: TokenStandard = "unknown";
        if (tzktToken?.standard) {
            switch (tzktToken.standard.toLowerCase()) {
                case "fa2":
                    standard = "fa2";
                    break;
                case "fa1.2":
                case "fa12":
                    standard = "fa1.2";
                    break;
                default:
                    standard = "unknown";
            }
        }

        const now = new Date();
        const mintTime = tzktToken.firstMinted ? new Date(tzktToken.firstMinted) : now;

        const unifiedToken: UnifiedToken = {
            id: `${tzktToken?.contract?.address || "unknown"}_${tzktToken?.tokenId || "0"}`,
            contractAddress: tzktToken?.contract?.address || "unknown",
            contractAlias: tzktToken?.contract?.alias || undefined,
            tokenId: tzktToken?.tokenId || "0",
            balance: "1", // For collections/curations, we show tokens, not balances
            standard,
            metadata,
            source: {
                provider: "tzkt",
                version: "1.0",
                endpoint: "https://api.tzkt.io",
                priority: 1,
            },
            fetchedAt: now,
            lastTransferAt: mintTime,
            firstMintAt: mintTime,
            isValid: !!(tzktToken?.metadata && tzktToken.contract?.address),
            hasImage: !!(metadata.image || metadata.artifactUri || metadata.displayUri || metadata.thumbnailUri),
            hasMetadata: !!tzktToken?.metadata,
        };

        // Set computed display fields
        unifiedToken.displayImage =
            metadata.displayUri || metadata.artifactUri || metadata.image || metadata.thumbnailUri;
        unifiedToken.displayName = metadata.name || `Token #${unifiedToken.tokenId}`;

        // Use mint timestamp for sort key
        unifiedToken.sortKey = mintTime.toISOString();

        return unifiedToken;
    }
}

// Export singleton instance
export const objktQueries = new ObjktQueries();

// Export convenience functions for use in data orchestrator
export async function fetchCurationTokens(curationId: string): Promise<UnifiedToken[]> {
    const result = await objktQueries.fetchCurationTokensComplete(curationId);
    return result.tokens;
}

export async function fetchCollectionTokens(contractAddress: string): Promise<UnifiedToken[]> {
    return objktQueries.fetchCollectionTokensViaTzKT(contractAddress);
}

export async function getCurationInfo(curationId: string): Promise<CurationInfo> {
    return objktQueries.getCurationMetadata(curationId);
}
