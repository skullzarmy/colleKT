/**
 * Provider Interface
 *
 * Common interface for all data sources (TzKT, Objkt, future providers)
 * Standardizes token format, pagination, and error handling across providers
 */

import type { UnifiedToken, UnifiedDomain, UnifiedMetadata, TokenStandard, DataSource } from "../types/token-types.js";

import type { generateFilterHash, CacheMetadata, CacheEntry } from "../types/cache-types.js";

/**
 * Pagination options for data queries
 */
export interface PaginationOptions {
    offset: number;
    limit: number;
    sort?: {
        field: string;
        direction: "asc" | "desc";
    };
}

/**
 * Domain query options
 */
export interface DomainQueryOptions {
    reverse?: boolean;
    limit?: number;
}

/**
 * Token filtering options (integrates with filter-rules.ts)
 */
export interface TokenFilters {
    // Basic filters
    balanceGt?: string;
    requireMetadata?: boolean;
    excludeUtilityTokens?: boolean;

    // Contract filters
    contractWhitelist?: string[];
    contractBlacklist?: string[];

    // Metadata filters
    requireImage?: boolean;
    requireName?: boolean;

    // Utility token detection
    maxSupply?: number;
    excludeHighDecimals?: boolean;

    // Custom field selection
    selectFields?: string[];
}

/**
 * Unified response wrapper for token queries
 */
export interface UnifiedTokenResponse {
    tokens: UnifiedToken[];
    pagination: {
        offset: number;
        limit: number;
        total?: number;
        hasMore: boolean;
    };
    source: DataSource;
    timing: {
        fetchedAt: Date;
        duration: number;
    };
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
    name: string;
    priority: number;
    baseUrl?: string;
    apiKey?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    enableLogging?: boolean;
    rateLimit?: {
        requestsPerSecond: number;
        burstSize: number;
    };
}

/**
 * Provider health status
 */
export interface ProviderHealth {
    isHealthy: boolean;
    responseTime?: number;
    lastCheck: Date;
    errorMessage?: string;
}

/**
 * Data provider interface - all providers must implement this contract
 */
export interface DataProvider {
    /**
     * Provider identity and configuration
     */
    readonly name: string;
    readonly priority: number;
    readonly config: ProviderConfig;

    /**
     * Health check and status monitoring
     */
    healthCheck(): Promise<ProviderHealth>;

    /**
     * Domain operations
     */
    getDomainsByAddress(address: string, options?: DomainQueryOptions): Promise<UnifiedDomain[]>;

    getDomainsByName(name: string, options?: DomainQueryOptions): Promise<UnifiedDomain[]>;

    /**
     * Token operations
     */
    getTokenBalancesCount(address: string, filters?: TokenFilters): Promise<number>;

    getTokenBalances(
        address: string,
        pagination: PaginationOptions,
        filters?: TokenFilters
    ): Promise<UnifiedTokenResponse>;

    /**
     * Utility methods
     */
    validateAddress(address: string): boolean;
    transformFilters(filters: TokenFilters): any; // Provider-specific filter format
}

/**
 * Provider factory interface for creating providers
 */
export interface ProviderFactory {
    createProvider(config: ProviderConfig): DataProvider;
    getSupportedProviders(): string[];
}

/**
 * Multi-provider orchestrator interface (for future use)
 */
export interface MultiProviderOrchestrator {
    providers: DataProvider[];

    addProvider(provider: DataProvider): void;
    removeProvider(providerName: string): void;

    // Multi-source queries with fallback logic
    getTokenBalances(
        address: string,
        pagination: PaginationOptions,
        filters?: TokenFilters,
        options?: {
            preferredProvider?: string;
            enableFallback?: boolean;
            mergeResults?: boolean;
        }
    ): Promise<UnifiedTokenResponse>;

    // Health monitoring across all providers
    getProviderHealth(): Promise<Record<string, ProviderHealth>>;
}

/**
 * Error types for provider operations
 */
export class ProviderError extends Error {
    public readonly provider: string;
    public readonly operation: string;
    public readonly originalError?: Error;
    public readonly statusCode?: number;

    constructor(message: string, provider: string, operation: string, originalError?: Error, statusCode?: number) {
        super(message);
        this.name = "ProviderError";
        this.provider = provider;
        this.operation = operation;
        this.originalError = originalError;
        this.statusCode = statusCode;
    }
}

export class ProviderTimeoutError extends ProviderError {
    constructor(provider: string, operation: string, timeoutMs: number) {
        super(`Provider ${provider} timed out after ${timeoutMs}ms during ${operation}`, provider, operation);
        this.name = "ProviderTimeoutError";
    }
}

export class ProviderRateLimitError extends ProviderError {
    constructor(provider: string, operation: string, retryAfterSeconds?: number) {
        super(
            `Provider ${provider} rate limited during ${operation}${
                retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ""
            }`,
            provider,
            operation
        );
        this.name = "ProviderRateLimitError";
    }
}
