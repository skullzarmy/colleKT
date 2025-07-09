/**
 * TzKT SDK Client Wrapper
 *
 * Provides a robust wrapper around the TzKT TypeScript SDK with:
 * - Error handling and retry logic
 * - Type safety improvements
 * - Standardized response formats
 * - Logging for debugging
 */

import {
    domainsGet,
    domainsGetByName,
    tokensGetTokenBalancesCount,
    tokensGetTokenBalances,
    contractsGet,
    defaults as sdkDefaults,
} from "@tzkt/sdk-api";

// Configure SDK defaults
sdkDefaults.baseUrl = "https://api.tzkt.io";

/**
 * Configuration options for the TzKT SDK client
 */
export interface TzktSdkClientConfig {
    baseUrl?: string;
    maxRetries?: number;
    retryDelayMs?: number;
    enableLogging?: boolean;
}

/**
 * Contract result from TzKT API
 */
export interface TzktContract {
    address?: string | null;
    alias?: string | null;
    kind?: string | null;
    balance?: number | null;
    creator?: {
        alias?: string | null;
        address?: string | null;
    } | null;
    tzips?: string[] | null;
    metadata?: {
        name?: string | null;
        description?: string | null;
        version?: string | null;
        license?: string | null;
        authors?: string[] | null;
        homepage?: string | null;
        source?: string | null;
        interfaces?: string[] | null;
        [key: string]: any;
    } | null;
    typeHash?: number | null;
    codeHash?: number | null;
}
/**
 * Domain result from TzKT API - using flexible typing to match SDK
 */
export interface TzktDomain {
    name?: string | null;
    owner?: {
        address?: string | null;
    } | null;
    address?: {
        address?: string | null;
    } | null;
    reverse?: boolean | null;
}

/**
 * Token balance result from TzKT API - using flexible typing to match SDK
 */
export interface TzktTokenBalance {
    balance?: string | null;
    firstTime?: string | null; // ISO timestamp when balance was first changed (collection time)
    lastTime?: string | null; // ISO timestamp when balance was last changed
    token?: {
        id?: number | null;
        contract?: {
            address?: string | null;
            alias?: string | null; // ← ADD contract alias field
        } | null;
        tokenId?: string | null;
        standard?: string | null;
        totalSupply?: string | null; // Add total supply field
        metadata?: {
            name?: string | null;
            symbol?: string | null;
            decimals?: string | null;
            description?: string | null;
            image?: string | null;
            artifactUri?: string | null;
            displayUri?: string | null;
            thumbnailUri?: string | null;
            supply?: string | null; // Also add to metadata for consistency
            [key: string]: any;
        } | null;
    } | null;
}

/**
 * Paginated response wrapper
 */
export interface TzktPaginatedResponse<T> {
    data: T[];
    total?: number;
    hasMore: boolean;
}

/**
 * Error class for TzKT SDK operations
 */
export class TzktSdkError extends Error {
    public readonly operation: string;
    public readonly originalError?: Error;
    public readonly statusCode?: number;

    constructor(message: string, operation: string, originalError?: Error, statusCode?: number) {
        super(message);
        this.name = "TzktSdkError";
        this.operation = operation;
        this.originalError = originalError;
        this.statusCode = statusCode;
    }
}

/**
 * TzKT SDK Client with error handling and retry logic
 */
export class TzktSdkClient {
    private config: Required<TzktSdkClientConfig>;

    constructor(config: TzktSdkClientConfig = {}) {
        this.config = {
            baseUrl: "https://api.tzkt.io",
            maxRetries: 3,
            retryDelayMs: 1000,
            enableLogging: true,
            ...config,
        };

        // Configure SDK base URL if provided
        if (config.baseUrl) {
            sdkDefaults.baseUrl = config.baseUrl;
        }
    }

    /**
     * Log messages if logging is enabled
     */
    private log(level: "info" | "error" | "warn", message: string, data?: any) {
        if (!this.config.enableLogging) return;

        const timestamp = new Date().toISOString();
        const prefix = `[TzktSdkClient ${timestamp}]`;

        switch (level) {
            case "error":
                console.error(`${prefix} ERROR: ${message}`, data || "");
                break;
            case "warn":
                console.warn(`${prefix} WARN: ${message}`, data || "");
                break;
            default:
                console.log(`${prefix} ${message}`, data || "");
        }
    }

    /**
     * Retry wrapper for SDK operations
     */
    private async withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                this.log("info", `${operation} - Attempt ${attempt}/${this.config.maxRetries}`);
                const result = await fn();
                this.log("info", `${operation} - Success on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error as Error;
                this.log("warn", `${operation} - Failed attempt ${attempt}`, error);

                if (attempt < this.config.maxRetries) {
                    const delay = this.config.retryDelayMs * attempt;
                    this.log("info", `${operation} - Retrying in ${delay}ms`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw new TzktSdkError(
            `${operation} failed after ${this.config.maxRetries} attempts. Last error: ${
                lastError?.message || "Unknown error"
            }`,
            operation,
            lastError || undefined
        );
    }

    /**
     * Get domains by address with reverse lookup option
     */
    async getDomainsByAddress(address: string, reverse: boolean = true, limit: number = 1): Promise<TzktDomain[]> {
        return this.withRetry(`getDomainsByAddress(${address})`, async () => {
            const result = await domainsGet({
                address: { eq: address },
                reverse: { eq: reverse },
                limit,
            });
            return result || [];
        });
    }

    /**
     * Get domains by name
     */
    async getDomainsByName(name: string, limit: number = 1): Promise<TzktDomain[]> {
        return this.withRetry(`getDomainsByName(${name})`, async () => {
            const result = await domainsGetByName(name);
            // domainsGetByName returns a single domain or null, so wrap in array
            return result ? [result] : [];
        });
    }

    /**
     * Get token balances count for an address
     */
    async getTokenBalancesCount(
        address: string,
        filters: {
            balanceGt?: string;
            tokenMetadataNotNull?: boolean;
        } = {}
    ): Promise<number> {
        return this.withRetry(`getTokenBalancesCount(${address})`, async () => {
            const queryParams: any = {
                account: { eq: address },
            };

            if (filters.balanceGt !== undefined) {
                queryParams.balance = { gt: filters.balanceGt };
            }

            if (filters.tokenMetadataNotNull) {
                queryParams.token = {
                    metadata: { ne: null },
                };
            }

            const result = await tokensGetTokenBalancesCount(queryParams);
            return result || 0;
        });
    }

    /**
     * Get ALL token balances for an address (no pagination - fetch everything)
     */
    async getTokenBalances(
        address: string,
        offset: number = 0, // Keep for compatibility but ignore
        limit: number = 20, // Keep for compatibility but ignore
        filters: {
            balanceGt?: string;
            tokenMetadataNotNull?: boolean;
            selectFields?: string[];
        } = {}
    ): Promise<TzktPaginatedResponse<TzktTokenBalance>> {
        return this.withRetry(`getTokenBalances(${address}) - FETCH ALL`, async () => {
            const queryParams: any = {
                account: { eq: address },
                limit: 10000, // Reduced limit to avoid timeouts - still handles large collections
                sort: { asc: "firstTime" }, // Sort by collection timestamp (oldest first)
            };

            if (filters.balanceGt !== undefined) {
                queryParams.balance = { gt: filters.balanceGt };
            }

            if (filters.tokenMetadataNotNull) {
                queryParams.token = {
                    metadata: { ne: null },
                };
            }

            if (filters.selectFields && filters.selectFields.length > 0) {
                queryParams.select = {
                    fields: filters.selectFields,
                };
            }

            const result = await tokensGetTokenBalances(queryParams);
            const data = result || [];

            return {
                data,
                hasMore: false, // Always false since we got everything
                total: data.length, // Total is the actual count
            };
        });
    }

    /**
     * Get token balances with total count (convenience method)
     */
    async getTokenBalancesWithCount(
        address: string,
        offset: number = 0,
        limit: number = 20,
        filters: {
            balanceGt?: string;
            tokenMetadataNotNull?: boolean;
            selectFields?: string[];
        } = {}
    ): Promise<TzktPaginatedResponse<TzktTokenBalance>> {
        const [balances, total] = await Promise.all([
            this.getTokenBalances(address, offset, limit, filters),
            this.getTokenBalancesCount(address, {
                balanceGt: filters.balanceGt,
                tokenMetadataNotNull: filters.tokenMetadataNotNull,
            }),
        ]);

        return {
            ...balances,
            total,
        };
    }

    /**
     * Get contract details by address - TRY ACCOUNTS ENDPOINT FOR ALIAS
     */
    async getContract(address: string): Promise<TzktContract | null> {
        return this.withRetry(`getContract(${address})`, async () => {
            try {
                // Try accounts endpoint instead - contracts are also accounts and might have alias there
                const response = await fetch(`${this.config.baseUrl}/v1/accounts/${address}`);

                if (!response.ok) {
                    console.error(`❌ ACCOUNTS API failed with status ${response.status}: ${response.statusText}`);
                    return null;
                }

                const account = await response.json();

                return account as TzktContract;
            } catch (error) {
                console.error(`❌ DIRECT API Failed:`, error);
                return null;
            }
        });
    }

    /**
     * Health check method to verify SDK is working
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Try a simple API call to verify connectivity
            await this.getTokenBalancesCount("tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb", {});
            return true;
        } catch (error) {
            this.log("error", "Health check failed", error);
            return false;
        }
    }
}

/**
 * Default client instance
 */
export const tzktSdkClient = new TzktSdkClient();

/**
 * Create a new client instance with custom configuration
 */
export function createTzktSdkClient(config: TzktSdkClientConfig): TzktSdkClient {
    return new TzktSdkClient(config);
}
