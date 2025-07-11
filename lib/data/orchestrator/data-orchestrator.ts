/**
 * Data Orchestrator - Main cache-first data coordination layer
 *
 * Orchestrates the complete data flow: cache check → fetch → filter → sort → cache → return
 * Provides a unified API for all token collection operations while solving pagination issues
 * through client-side filtering of complete collections.
 */

import { tzktSdkClient, TzktTokenBalance } from "../sources/tzkt-sdk-client";
import { cacheManager } from "../cache/cache-manager";
import { filterEngine, FilterResult } from "../filters/filter-engine";
import { UnifiedToken, DataSource, UnifiedMetadata, TokenStandard } from "../types/token-types";
import { tokenCollection, filteredCollection } from "../types/cache-types";
import { GalleryType } from "../types/gallery-types";
import { fetchCurationTokens, fetchCollectionTokens } from "../sources/objkt-queries";

/**
 * Pagination configuration
 */
export interface PaginationConfig {
    page: number; // 1-based page number
    pageSize: number; // Items per page
    offset?: number; // Alternative to page-based pagination
    limit?: number; // Alternative to pageSize
}

/**
 * Collection fetch options
 */
export interface CollectionFetchOptions {
    address: string;
    pagination?: PaginationConfig;
    forceRefresh?: boolean; // Skip cache, force fresh fetch
    applyFilters?: boolean; // Apply filter engine (default: true)
    cacheResults?: boolean; // Cache the results (default: true)
    sortChronologically?: boolean; // Sort by mint/transfer date (default: true)
}

/**
 * Curation fetch options (NEW)
 */
export interface CurationFetchOptions {
    curationId: string;
    pagination?: PaginationConfig;
    forceRefresh?: boolean;
    applyFilters?: boolean;
    cacheResults?: boolean;
}

/**
 * Collection fetch options (contract-based) (NEW)
 */
export interface ContractCollectionFetchOptions {
    contractAddress: string;
    pagination?: PaginationConfig;
    forceRefresh?: boolean;
    applyFilters?: boolean;
    cacheResults?: boolean;
}

/**
 * Orchestrator response with rich metadata
 */
export interface OrchestrationResult {
    // Data
    tokens: UnifiedToken[];

    // Pagination metadata
    pagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startIndex: number;
        endIndex: number;
    };

    // Cache metadata
    cache: {
        hit: boolean;
        source: "cache" | "api" | "hybrid";
        buildTimeMs?: number;
        cacheKey?: string;
    };

    // Filter metadata
    filtering?: FilterResult;

    // Performance metadata
    performance: {
        totalTimeMs: number;
        fetchTimeMs?: number;
        filterTimeMs?: number;
        cacheTimeMs?: number;
    };

    // Source tracking
    dataSources: DataSource[];
    fetchedAt: Date;
}

/**
 * Main data orchestrator class
 */
export class DataOrchestrator {
    private defaultPageSize = 20; // Match gallery NFTS_PER_ROOM

    /**
     * Get paginated token collection with cache-first approach
     */
    async getTokenCollection(options: CollectionFetchOptions): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const {
            address,
            pagination = { page: 1, pageSize: this.defaultPageSize },
            forceRefresh = false,
            applyFilters = true,
            cacheResults = true,
            sortChronologically = true,
        } = options;

        // Normalize pagination
        const page =
            pagination.page || Math.floor((pagination.offset || 0) / (pagination.limit || this.defaultPageSize)) + 1;
        const pageSize = pagination.pageSize || pagination.limit || this.defaultPageSize;

        // Generate cache keys
        const baseKey = tokenCollection(address);
        const filterHash = applyFilters ? filterEngine.generateFilterHash() : "none";
        const filteredKey = applyFilters ? filteredCollection(address, filterHash) : baseKey;

        let tokens: UnifiedToken[] = [];
        let cacheHit = false;
        let cacheSource: "cache" | "api" | "hybrid" = "api";
        let buildTimeMs: number | undefined;
        let fetchTimeMs: number | undefined;
        let filterTimeMs: number | undefined;
        let cacheTimeMs: number | undefined;
        let filterResult: FilterResult | undefined;

        try {
            // Step 1: If force refresh, clear existing cache first
            if (forceRefresh) {
                console.log(`🗑️ Force refresh requested - clearing all cache for ${address}`);
                await this.clearAllCacheForAddress(address);
            }

            // Step 2: Try cache first (unless force refresh)
            if (!forceRefresh) {
                const cacheStart = Date.now();
                const cached = await cacheManager.get<UnifiedToken[]>(filteredKey);
                cacheTimeMs = Date.now() - cacheStart;

                if (cached.hit && cached.data) {
                    tokens = cached.data;
                    cacheHit = true;
                    cacheSource = "cache";
                }
            }

            // Step 3: If cache miss or force refresh, fetch from API
            if (!cacheHit) {
                const fetchStart = Date.now();

                // Fetch complete collection (no pagination at API level)
                const [totalCount, allTokens] = await Promise.all([
                    tzktSdkClient.getTokenBalancesCount(address),
                    this.fetchCompleteCollection(address),
                ]);

                fetchTimeMs = Date.now() - fetchStart;
                tokens = allTokens;

                // Step 3: Apply filtering if requested
                if (applyFilters && filterEngine.hasActiveFilters()) {
                    const filterStart = Date.now();
                    filterResult = filterEngine.applyFilters(tokens);
                    tokens = filterResult.filteredTokens;
                    filterTimeMs = Date.now() - filterStart;
                }

                // Step 4: Sort chronologically if requested
                if (sortChronologically) {
                    tokens = this.sortTokensChronologically(tokens);
                }

                // Step 5: Cache the results for future use
                if (cacheResults) {
                    const cacheStart = Date.now();
                    await cacheManager.buildCache(filteredKey, tokens);
                    cacheTimeMs = Date.now() - cacheStart;
                }

                buildTimeMs = Date.now() - startTime;
                cacheSource = "api";
            }

            // Step 6: Apply pagination to the complete filtered collection
            const totalItems = tokens.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            const paginatedTokens = tokens.slice(startIndex, endIndex);

            const totalTimeMs = Date.now() - startTime;

            return {
                tokens: paginatedTokens,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    startIndex,
                    endIndex: endIndex - 1, // Make it inclusive
                },
                cache: {
                    hit: cacheHit,
                    source: cacheSource,
                    buildTimeMs,
                    cacheKey: filteredKey,
                },
                filtering: filterResult,
                performance: {
                    totalTimeMs,
                    fetchTimeMs,
                    filterTimeMs,
                    cacheTimeMs,
                },
                dataSources: [
                    {
                        provider: "tzkt",
                        version: "1.0",
                        endpoint: "https://api.tzkt.io",
                        priority: 1,
                    },
                ],
                fetchedAt: new Date(),
            };
        } catch (error) {
            console.error("Data orchestration error:", error);
            throw new Error(
                `Failed to orchestrate data for ${address}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    /**
     * Get token count for an address (with caching)
     */
    async getTokenCount(address: string, applyFilters: boolean = true): Promise<number> {
        // If filters are applied, we need the complete collection to count accurately
        if (applyFilters && filterEngine.hasActiveFilters()) {
            const result = await this.getTokenCollection({
                address,
                pagination: { page: 1, pageSize: 1 }, // Minimal pagination for count
                applyFilters: true,
            });
            return result.pagination.totalItems;
        }

        // Otherwise, use direct API count
        try {
            const url = new URL("https://api.tzkt.io/v1/tokens/balances/count");
            url.searchParams.set("account", address);
            url.searchParams.set("balance.gt", "0");
            // Remove the problematic metadata filter for now

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Count API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to get token count from direct API:", error);
            throw error;
        }
    }

    /**
     * Invalidate cache for an address (current filter configuration only)
     */
    async invalidateCache(address: string): Promise<void> {
        const baseKey = tokenCollection(address);
        const filterHash = filterEngine.generateFilterHash();
        const filteredKey = filteredCollection(address, filterHash);

        await Promise.all([cacheManager.invalidate(baseKey), cacheManager.invalidate(filteredKey)]);

        console.log(`🗑️ Invalidated cache for ${address} (filter: ${filterHash})`);
    }

    /**
     * Clear ALL cache entries for an address regardless of filter configuration
     * This is what the refresh button should actually call!
     */
    async clearAllCacheForAddress(address: string): Promise<void> {
        // Use Redis pattern matching to find all keys for this address
        const pattern = `*${address}*`;

        try {
            const deletedCount = await cacheManager.invalidatePattern(pattern);
            console.log(`🗑️ Cleared ${deletedCount} cache entries for ${address}`);
        } catch (error) {
            console.error("Failed to clear cache for address:", error);
            // Fallback: just clear the current filter cache
            await this.invalidateCache(address);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return cacheManager.getStats();
    }

    /**
     * Health check for all components
     */
    async healthCheck(): Promise<{
        cache: boolean;
        api: boolean;
        filters: boolean;
        overall: boolean;
    }> {
        // Test direct API health
        let apiHealth = false;
        try {
            const response = await fetch("https://api.tzkt.io/v1/head");
            apiHealth = response.ok;
        } catch {
            apiHealth = false;
        }

        const cacheHealth = await cacheManager.healthCheck();
        const filtersHealth = true; // Always healthy
        const overall = cacheHealth && apiHealth && filtersHealth;

        return {
            cache: cacheHealth,
            api: apiHealth,
            filters: filtersHealth,
            overall,
        };
    }

    /**
     * Convert direct API token balance response to UnifiedToken format
     */
    private convertDirectApiToken(apiToken: any): UnifiedToken {
        const token = apiToken.token;

        const metadata: UnifiedMetadata = {
            name: token?.metadata?.name || undefined,
            symbol: token?.metadata?.symbol || undefined,
            decimals: token?.metadata?.decimals ? Number(token.metadata.decimals) : undefined,
            description: token?.metadata?.description || undefined,
            image: token?.metadata?.image || undefined,
            artifactUri: token?.metadata?.artifactUri || undefined,
            displayUri: token?.metadata?.displayUri || undefined,
            thumbnailUri: token?.metadata?.thumbnailUri || undefined,
            supply: token?.totalSupply || token?.metadata?.supply || undefined,
            creators: token?.metadata?.creators || undefined,
            attributes: token?.metadata?.attributes || undefined,
            // 🔥 CRITICAL FIX: Preserve formats data with MIME types
            formats: token?.metadata?.formats || undefined,
            // Store raw metadata for fallback detection
            raw: token?.metadata || undefined,
        };

        // Determine token standard
        let standard: TokenStandard = "unknown";
        if (token?.standard) {
            switch (token.standard.toLowerCase()) {
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
        const collectionTime = apiToken.firstTime ? new Date(apiToken.firstTime) : now;

        const unifiedToken: UnifiedToken = {
            id: `${token?.contract?.address || "unknown"}_${token?.tokenId || "0"}`,
            contractAddress: token?.contract?.address || "unknown",
            contractAlias: token?.contract?.alias || undefined, // ← NOW WE GET THE REAL CONTRACT ALIAS!
            tokenId: token?.tokenId || "0",
            balance: apiToken.balance || "0",
            standard,
            metadata,
            source: {
                provider: "tzkt",
                version: "1.0",
                endpoint: "https://api.tzkt.io",
                priority: 1,
            },
            fetchedAt: now,
            lastTransferAt: collectionTime,
            firstMintAt: collectionTime,
            isValid: !!(token?.metadata && token.contract?.address),
            hasImage: !!(metadata.image || metadata.artifactUri || metadata.displayUri || metadata.thumbnailUri),
            hasMetadata: !!token?.metadata,
        };

        // Set computed display fields
        unifiedToken.displayImage =
            metadata.displayUri || metadata.artifactUri || metadata.image || metadata.thumbnailUri;
        unifiedToken.displayName = metadata.name || `Token #${unifiedToken.tokenId}`;

        // Use collection timestamp for sort key
        unifiedToken.sortKey = collectionTime.toISOString();

        return unifiedToken;
    }

    /**
     * Convert TzktTokenBalance to UnifiedToken format
     */
    private convertToUnifiedToken(tzktToken: TzktTokenBalance): UnifiedToken {
        const token = tzktToken.token;
        const metadata: UnifiedMetadata = {
            name: token?.metadata?.name || undefined,
            symbol: token?.metadata?.symbol || undefined,
            decimals: token?.metadata?.decimals ? Number(token.metadata.decimals) : undefined,
            description: token?.metadata?.description || undefined,
            image: token?.metadata?.image || undefined,
            artifactUri: token?.metadata?.artifactUri || undefined,
            displayUri: token?.metadata?.displayUri || undefined,
            thumbnailUri: token?.metadata?.thumbnailUri || undefined,
            supply: token?.totalSupply || token?.metadata?.supply || undefined,
            creators: token?.metadata?.creators || undefined,
            attributes: token?.metadata?.attributes || undefined,
            // 🔥 CRITICAL FIX: Preserve formats data with MIME types
            formats: token?.metadata?.formats || undefined,
            // Store raw metadata for fallback detection
            raw: token?.metadata || undefined,
        };

        // 🔍 DEBUG: Log creators to understand the alias issue
        if (token?.metadata?.creators) {
            // Debug logging removed for production
        }

        // Determine token standard
        let standard: TokenStandard = "unknown";
        if (token?.standard) {
            switch (token.standard.toLowerCase()) {
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
        const collectionTime = tzktToken.firstTime ? new Date(tzktToken.firstTime) : now;

        const unifiedToken: UnifiedToken = {
            id: `${token?.contract?.address || "unknown"}_${token?.tokenId || "0"}`,
            contractAddress: token?.contract?.address || "unknown",
            tokenId: token?.tokenId || "0",
            balance: tzktToken.balance || "0",
            standard,
            metadata,
            source: {
                provider: "tzkt",
                version: "1.0",
                endpoint: "https://api.tzkt.io",
                priority: 1,
            },
            fetchedAt: now,
            lastTransferAt: collectionTime, // When you first collected this token
            firstMintAt: collectionTime, // Use same timestamp for consistency
            isValid: !!(token?.metadata && token.contract?.address),
            hasImage: !!(metadata.image || metadata.artifactUri || metadata.displayUri || metadata.thumbnailUri),
            hasMetadata: !!token?.metadata,
        };

        // Set computed display fields
        unifiedToken.displayImage =
            metadata.displayUri || metadata.artifactUri || metadata.image || metadata.thumbnailUri;
        unifiedToken.displayName = metadata.name || `Token #${unifiedToken.tokenId}`;

        // Use collection timestamp for sort key (will be pre-sorted by TzKT)
        unifiedToken.sortKey = collectionTime.toISOString();

        return unifiedToken;
    }

    /**
     * Fetch complete token collection from API (no pagination needed!)
     */
    private async fetchCompleteCollection(address: string): Promise<UnifiedToken[]> {
        // Build URL with parameters - following TzKT API docs exactly
        const url = new URL("https://api.tzkt.io/v1/tokens/balances");
        url.searchParams.set("account", address);
        url.searchParams.set("balance.gt", "0");
        url.searchParams.set("limit", "10000"); // Max limit to get everything
        // NO SELECT - use default response which has everything we need!

        try {
            // Configure fetch with proper timeouts and headers
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "User-Agent": "colleKT/1.0",
                },
                // Increase timeout for large collections
                signal: AbortSignal.timeout(120000), // 2 minutes timeout
            });

            if (!response.ok) {
                console.error(`❌ API Response: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.error(`❌ Error body: ${errorText}`);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const tokens = await response.json();

            // Convert all tokens to UnifiedToken format with error handling
            const convertedTokens = tokens
                .map((tzktToken: any, index: number) => {
                    try {
                        return this.convertDirectApiToken(tzktToken);
                    } catch (error) {
                        console.error(`❌ ERROR converting token ${index}:`, error);
                        console.error(`❌ Failed token data:`, JSON.stringify(tzktToken, null, 2));
                        return null;
                    }
                })
                .filter((token: UnifiedToken | null): token is UnifiedToken => token !== null);

            return convertedTokens;
        } catch (error) {
            console.error("❌ Failed to fetch tokens from direct API:", error);

            // If timeout or connection error, try with smaller limit
            if (
                error instanceof Error &&
                (error.message.includes("timeout") ||
                    error.message.includes("terminated") ||
                    error.message.includes("UND_ERR_SOCKET"))
            ) {
                return this.fetchCollectionInBatches(address);
            }

            throw error;
        }
    }

    /**
     * Fallback method to fetch collection in smaller batches
     */
    private async fetchCollectionInBatches(address: string): Promise<UnifiedToken[]> {
        const batchSize = 1000; // Smaller batch size
        let allTokens: UnifiedToken[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            try {
                const url = new URL("https://api.tzkt.io/v1/tokens/balances");
                url.searchParams.set("account", address);
                url.searchParams.set("balance.gt", "0");
                url.searchParams.set("limit", batchSize.toString());
                url.searchParams.set("offset", offset.toString());

                const response = await fetch(url.toString(), {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "User-Agent": "colleKT/1.0",
                    },
                    signal: AbortSignal.timeout(30000), // 30 second timeout per batch
                });

                if (!response.ok) {
                    throw new Error(`Batch API request failed: ${response.status} ${response.statusText}`);
                }

                const batchTokens = await response.json();

                if (batchTokens.length === 0) {
                    hasMore = false;
                    break;
                }

                // Convert batch tokens
                const convertedBatch = batchTokens
                    .map((tzktToken: any) => {
                        try {
                            return this.convertDirectApiToken(tzktToken);
                        } catch (error) {
                            console.error(`❌ ERROR converting token:`, error);
                            return null;
                        }
                    })
                    .filter((token: UnifiedToken | null): token is UnifiedToken => token !== null);

                allTokens.push(...convertedBatch);
                offset += batchSize;

                // If we got fewer tokens than the batch size, we're done
                if (batchTokens.length < batchSize) {
                    hasMore = false;
                }

                // Add small delay between batches to be nice to the API
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`❌ Failed to fetch batch at offset ${offset}:`, error);
                throw error;
            }
        }

        return allTokens;
    }

    /**
     * Sort tokens chronologically (oldest first - chronological order)
     */
    private sortTokensChronologically(tokens: UnifiedToken[]): UnifiedToken[] {
        return [...tokens].sort((a, b) => {
            // Primary sort: lastTransferAt (if available) - oldest first
            if (a.lastTransferAt && b.lastTransferAt) {
                return new Date(a.lastTransferAt).getTime() - new Date(b.lastTransferAt).getTime();
            }

            // Secondary sort: firstMintAt (if available) - oldest first
            if (a.firstMintAt && b.firstMintAt) {
                return new Date(a.firstMintAt).getTime() - new Date(b.firstMintAt).getTime();
            }

            // Fallback: stable sorting by contract address + token ID (ascending)
            // This ensures consistent order when timestamps are missing
            const sortKeyA = a.sortKey || `${a.contractAddress}-${String(a.tokenId).padStart(10, "0")}`;
            const sortKeyB = b.sortKey || `${b.contractAddress}-${String(b.tokenId).padStart(10, "0")}`;
            return sortKeyA.localeCompare(sortKeyB);
        });
    }

    // ===== NEW GALLERY-SPECIFIC METHODS =====

    /**
     * Get CURATION gallery tokens via objkt → TzKT bridge
     */
    async getCurationTokenCollection(options: CurationFetchOptions): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const {
            curationId,
            pagination = { page: 1, pageSize: this.defaultPageSize },
            forceRefresh = false,
            applyFilters = true,
            cacheResults = true,
        } = options;

        // Normalize pagination
        const page =
            pagination.page || Math.floor((pagination.offset || 0) / (pagination.limit || this.defaultPageSize)) + 1;
        const pageSize = pagination.pageSize || pagination.limit || this.defaultPageSize;

        // Generate cache keys using new gallery-specific pattern
        const filterHash = applyFilters ? filterEngine.generateFilterHash() : "none";

        let tokens: UnifiedToken[] = [];
        let cacheHit = false;
        let cacheSource: "cache" | "api" | "hybrid" = "api";
        let buildTimeMs: number | undefined;
        let fetchTimeMs: number | undefined;
        let filterTimeMs: number | undefined;
        let cacheTimeMs: number | undefined;
        let filterResult: FilterResult | undefined;

        try {
            // Step 1: Try cache first (unless force refresh)
            if (!forceRefresh) {
                const cacheStart = Date.now();
                const cached = await cacheManager.getCurationTokens(curationId, filterHash);
                cacheTimeMs = Date.now() - cacheStart;

                if (cached.hit && cached.data) {
                    tokens = cached.data;
                    cacheHit = true;
                    cacheSource = "cache";
                }
            }

            // Step 2: If cache miss or force refresh, fetch via objkt → TzKT bridge
            if (!cacheHit) {
                const fetchStart = Date.now();

                // Use objkt-queries bridge to fetch curation tokens
                tokens = await fetchCurationTokens(curationId);

                fetchTimeMs = Date.now() - fetchStart;

                // Step 3: Apply filtering if requested
                if (applyFilters && filterEngine.hasActiveFilters()) {
                    const filterStart = Date.now();
                    filterResult = filterEngine.applyFilters(tokens);
                    tokens = filterResult.filteredTokens;
                    filterTimeMs = Date.now() - filterStart;
                }

                // Step 4: Cache the results
                if (cacheResults && tokens.length > 0) {
                    const cacheStart = Date.now();
                    await cacheManager.setCurationTokens(curationId, tokens, filterHash);
                    cacheTimeMs = Date.now() - cacheStart;
                }

                buildTimeMs = Date.now() - startTime;
                cacheSource = "api";
            }

            // Step 5: Apply pagination
            const totalItems = tokens.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            const paginatedTokens = tokens.slice(startIndex, endIndex);

            const totalTimeMs = Date.now() - startTime;

            return {
                tokens: paginatedTokens,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    startIndex,
                    endIndex: endIndex - 1,
                },
                cache: {
                    hit: cacheHit,
                    source: cacheSource,
                    buildTimeMs,
                    cacheKey: `curation:${curationId}:${filterHash}`,
                },
                filtering: filterResult,
                performance: {
                    totalTimeMs,
                    fetchTimeMs,
                    filterTimeMs,
                    cacheTimeMs,
                },
                dataSources: [
                    {
                        provider: "objkt",
                        version: "1.0",
                        endpoint: "https://data.objkt.com + https://api.tzkt.io",
                        priority: 1,
                    },
                ],
                fetchedAt: new Date(),
            };
        } catch (error) {
            console.error("Curation orchestration error:", error);
            throw new Error(
                `Failed to orchestrate curation data for ${curationId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get COLLECTION gallery tokens via direct TzKT contract filtering
     */
    async getCollectionTokenCollection(options: ContractCollectionFetchOptions): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const {
            contractAddress,
            pagination = { page: 1, pageSize: this.defaultPageSize },
            forceRefresh = false,
            applyFilters = true,
            cacheResults = true,
        } = options;

        // Normalize pagination
        const page =
            pagination.page || Math.floor((pagination.offset || 0) / (pagination.limit || this.defaultPageSize)) + 1;
        const pageSize = pagination.pageSize || pagination.limit || this.defaultPageSize;

        // Generate cache keys using new gallery-specific pattern
        const filterHash = applyFilters ? filterEngine.generateFilterHash() : "none";

        let tokens: UnifiedToken[] = [];
        let cacheHit = false;
        let cacheSource: "cache" | "api" | "hybrid" = "api";
        let buildTimeMs: number | undefined;
        let fetchTimeMs: number | undefined;
        let filterTimeMs: number | undefined;
        let cacheTimeMs: number | undefined;
        let filterResult: FilterResult | undefined;

        try {
            // Step 1: Try cache first (unless force refresh)
            if (!forceRefresh) {
                const cacheStart = Date.now();
                const cached = await cacheManager.getCollectionTokens(contractAddress, filterHash);
                cacheTimeMs = Date.now() - cacheStart;

                if (cached.hit && cached.data) {
                    tokens = cached.data;
                    cacheHit = true;
                    cacheSource = "cache";
                }
            }

            // Step 2: If cache miss or force refresh, fetch via direct TzKT
            if (!cacheHit) {
                const fetchStart = Date.now();

                // Use objkt-queries to fetch collection tokens directly from TzKT
                tokens = await fetchCollectionTokens(contractAddress);

                fetchTimeMs = Date.now() - fetchStart;

                // Step 3: Apply filtering if requested
                if (applyFilters && filterEngine.hasActiveFilters()) {
                    const filterStart = Date.now();
                    filterResult = filterEngine.applyFilters(tokens);
                    tokens = filterResult.filteredTokens;
                    filterTimeMs = Date.now() - filterStart;
                }

                // Step 4: Cache the results
                if (cacheResults && tokens.length > 0) {
                    const cacheStart = Date.now();
                    await cacheManager.setCollectionTokens(contractAddress, tokens, filterHash);
                    cacheTimeMs = Date.now() - cacheStart;
                }

                buildTimeMs = Date.now() - startTime;
                cacheSource = "api";
            }

            // Step 5: Apply pagination
            const totalItems = tokens.length;
            const totalPages = Math.ceil(totalItems / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalItems);
            const paginatedTokens = tokens.slice(startIndex, endIndex);

            const totalTimeMs = Date.now() - startTime;

            return {
                tokens: paginatedTokens,
                pagination: {
                    currentPage: page,
                    pageSize,
                    totalItems,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                    startIndex,
                    endIndex: endIndex - 1,
                },
                cache: {
                    hit: cacheHit,
                    source: cacheSource,
                    buildTimeMs,
                    cacheKey: `collection:${contractAddress}:${filterHash}`,
                },
                filtering: filterResult,
                performance: {
                    totalTimeMs,
                    fetchTimeMs,
                    filterTimeMs,
                    cacheTimeMs,
                },
                dataSources: [
                    {
                        provider: "tzkt",
                        version: "1.0",
                        endpoint: "https://api.tzkt.io",
                        priority: 1,
                    },
                ],
                fetchedAt: new Date(),
            };
        } catch (error) {
            console.error("Collection orchestration error:", error);
            throw new Error(
                `Failed to orchestrate collection data for ${contractAddress}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Fetch collection tokens directly from TzKT with contract filter (NEW)
     */
    private async fetchCollectionTokensViaTzKT(contractAddress: string): Promise<UnifiedToken[]> {
        // Build URL with contract filter
        const url = new URL("https://api.tzkt.io/v1/tokens");
        url.searchParams.set("contract", contractAddress);
        url.searchParams.set("limit", "10000"); // Max limit to get everything

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "User-Agent": "colleKT/1.0",
                },
                signal: AbortSignal.timeout(120000), // 2 minutes timeout
            });

            if (!response.ok) {
                throw new Error(`TzKT tokens API request failed: ${response.status} ${response.statusText}`);
            }

            const tokens = await response.json();

            // Convert TzKT token format to UnifiedToken format
            const convertedTokens = tokens
                .map((tzktToken: any, index: number) => {
                    try {
                        return this.convertTzKTTokenToUnified(tzktToken);
                    } catch (error) {
                        console.error(`❌ ERROR converting collection token ${index}:`, error);
                        return null;
                    }
                })
                .filter((token: UnifiedToken | null): token is UnifiedToken => token !== null);

            return convertedTokens;
        } catch (error) {
            console.error("❌ Failed to fetch collection tokens from TzKT:", error);
            throw error;
        }
    }

    /**
     * Convert TzKT token format to UnifiedToken (for collections)
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
            balance: "1", // Collections show tokens, not balances
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
export const dataOrchestrator = new DataOrchestrator();
