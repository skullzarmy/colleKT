/**
 * Cache Manager - Main orchestrator for cache operations
 *
 * Handles cache hit/miss logic, TTL management, compression, and cache invalidation.
 * Server-side only with direct Redis integration.
 */

import { Redis } from "@upstash/redis";
import { compressData, decompressData, CompressionConfig, DEFAULT_COMPRESSION_CONFIG } from "../utils/compression";
import {
    CacheMetadata,
    TokenCollectionCacheEntry,
    userCollection,
    curationCollection,
    contractCollection,
    curationMetadata,
    collectionMetadata,
} from "../types/cache-types";
import { UnifiedToken, DataSource } from "../types/token-types";

/**
 * Cache operation result
 */
export interface CacheResult<T> {
    data: T | null;
    hit: boolean;
    metadata?: CacheMetadata;
    error?: string;
}

/**
 * Cache build result for tracking cache population
 */
export interface CacheBuildResult {
    success: boolean;
    itemsCached: number;
    totalSize: number;
    compressionRatio: number;
    buildTimeMs: number;
    error?: string;
}

/**
 * Cache manager configuration
 */
export interface CacheManagerConfig {
    compression: CompressionConfig;
    defaultTtlSeconds: number;
    maxRetries: number;
    enableStatistics: boolean;
}

/**
 * Default cache manager configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheManagerConfig = {
    compression: DEFAULT_COMPRESSION_CONFIG,
    defaultTtlSeconds: 3600, // 1 hour
    maxRetries: 3,
    enableStatistics: true,
};

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    totalRequests: number;
    totalCacheBuilds: number;
    totalErrors: number;
    averageBuildTimeMs: number;
}

/**
 * Main cache manager class
 */
export class CacheManager {
    private config: CacheManagerConfig;
    private stats: CacheStats;
    private redis: Redis | null = null;
    private isConfigured: boolean;

    // Circuit breaker: after repeated failures we stop hitting Redis for a cooldown,
    // so a dead/unreachable instance (e.g. a deleted Upstash DB → ENOTFOUND) can't
    // turn every request into a multi-second hang.
    private consecutiveFailures = 0;
    private circuitOpenUntil = 0;
    private static readonly REDIS_TIMEOUT_MS = 2000;
    private static readonly CIRCUIT_FAILURE_THRESHOLD = 2;
    private static readonly CIRCUIT_COOLDOWN_MS = 60_000;

    constructor(config: Partial<CacheManagerConfig> = {}) {
        this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalRequests: 0,
            totalCacheBuilds: 0,
            totalErrors: 0,
            averageBuildTimeMs: 0,
        };

        // Redis caching is opt-in: it requires CACHE_ENABLED=true AND credentials.
        // Anything other than the literal "true" (including unset) leaves caching
        // off entirely — no Redis client, no network calls.
        const cacheEnabled = process.env.CACHE_ENABLED === "true";
        this.isConfigured =
            cacheEnabled && !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

        if (this.isConfigured) {
            this.redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
                // Fail fast: don't let the client's default retry/backoff turn an
                // unreachable host into a multi-second hang on every request.
                retry: false,
            });
        }
    }

    /**
     * Whether a Redis operation may be attempted right now: caching is configured,
     * a client exists, and the circuit breaker is not open from recent failures.
     */
    private canUseRedis(): boolean {
        return this.isConfigured && this.redis !== null && Date.now() >= this.circuitOpenUntil;
    }

    /**
     * Run a Redis operation with a hard timeout and circuit-breaker bookkeeping.
     * After CIRCUIT_FAILURE_THRESHOLD consecutive failures the circuit opens for a
     * cooldown, so subsequent calls short-circuit via canUseRedis() instead of
     * repeatedly waiting on a dead host.
     */
    private async execRedis<T>(op: () => Promise<T>): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`Redis operation timed out after ${CacheManager.REDIS_TIMEOUT_MS}ms`)),
                CacheManager.REDIS_TIMEOUT_MS,
            );
        });

        try {
            const result = await Promise.race([op(), timeout]);
            this.consecutiveFailures = 0; // healthy response: reset (half-open -> closed)
            return result;
        } catch (error) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= CacheManager.CIRCUIT_FAILURE_THRESHOLD) {
                this.circuitOpenUntil = Date.now() + CacheManager.CIRCUIT_COOLDOWN_MS;
                this.consecutiveFailures = 0;
                console.warn(
                    `[CacheManager] Redis unavailable; pausing cache for ${
                        CacheManager.CIRCUIT_COOLDOWN_MS / 1000
                    }s`,
                );
            }
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /**
     * Get cached data with automatic decompression
     */
    async get<T>(cacheKey: string): Promise<CacheResult<T>> {
        this.stats.totalRequests++;

        try {
            // Check if cache is available
            if (!this.canUseRedis()) {
                this.stats.misses++;
                this.updateHitRate();
                return {
                    data: null,
                    hit: false,
                    error: "Cache not available",
                };
            }

            // Attempt to get from cache - stored as Buffer if compressed
            const cached = await this.execRedis(() => this.redis!.get(cacheKey));

            if (!cached) {
                this.stats.misses++;
                this.updateHitRate();
                return {
                    data: null,
                    hit: false,
                };
            }

            // Check if data is compressed (stored as string) or uncompressed
            let decompressedData: T;

            if (typeof cached === "string") {
                // Try to determine if it's compressed by attempting decompression
                try {
                    // First, try as compressed data (base64 -> gunzip -> JSON)
                    decompressedData = await decompressData(cached, true);
                } catch {
                    try {
                        // If decompression fails, try parsing as JSON directly
                        decompressedData = JSON.parse(cached);
                    } catch {
                        // If both fail, use as is
                        decompressedData = cached as T;
                    }
                }
            } else if (typeof cached === "object" && cached !== null && "isCompressed" in cached) {
                // Legacy format - check metadata
                const cacheEntry = cached as any;
                if (cacheEntry.isCompressed && typeof cacheEntry.data === "string") {
                    decompressedData = await decompressData(cacheEntry.data, true);
                } else {
                    decompressedData = cacheEntry.data;
                }
            } else {
                // Data was not compressed or is already an object
                decompressedData = cached as T;
            }

            this.stats.hits++;
            this.updateHitRate();

            return {
                data: decompressedData,
                hit: true,
            };
        } catch (error) {
            this.stats.totalErrors++;
            this.stats.misses++;
            this.updateHitRate();

            console.error("Cache get error:", error);
            return {
                data: null,
                hit: false,
                error: error instanceof Error ? error.message : "Unknown cache error",
            };
        }
    }

    /**
     * Set cached data with automatic compression
     */
    async set<T>(cacheKey: string, data: T, ttlSeconds: number = this.config.defaultTtlSeconds): Promise<boolean> {
        try {
            // Check if cache is available
            if (!this.canUseRedis()) {
                return false;
            }

            // Compress the data
            const compressionResult = await compressData(data, this.config.compression);

            // Store the compressed data directly in Redis
            await this.execRedis(() => this.redis!.setex(cacheKey, ttlSeconds, compressionResult.data));

            return true;
        } catch (error) {
            this.stats.totalErrors++;
            console.error("Cache set error:", error);
            return false;
        }
    }

    /**
     * Delete cached data
     */
    async invalidate(cacheKey: string): Promise<boolean> {
        try {
            if (!this.canUseRedis()) {
                return false;
            }

            const result = await this.execRedis(() => this.redis!.del(cacheKey));
            return result > 0;
        } catch (error) {
            this.stats.totalErrors++;
            console.error("Cache invalidate error:", error);
            return false;
        }
    }

    /**
     * Delete multiple cached entries using pattern matching
     * WARNING: Use with caution - this scans all keys
     */
    async invalidatePattern(pattern: string): Promise<number> {
        try {
            if (!this.canUseRedis()) {
                return 0;
            }

            // Get all keys matching the pattern
            const keys = await this.execRedis(() => this.redis!.keys(pattern));

            if (keys.length === 0) {
                return 0;
            }

            // Delete all matching keys
            const result = await this.execRedis(() => this.redis!.del(...keys));
            return result;
        } catch (error) {
            this.stats.totalErrors++;
            console.error("Cache invalidate pattern error:", error);
            return 0;
        }
    }

    /**
     * Build cache for a collection of tokens
     * This is the main cache population method
     */
    async buildCache(
        cacheKey: string,
        tokens: UnifiedToken[],
        ttlSeconds: number = this.config.defaultTtlSeconds
    ): Promise<CacheBuildResult> {
        const startTime = Date.now();
        this.stats.totalCacheBuilds++;

        try {
            // Get compression info before storing
            const compressionResult = await compressData(tokens, this.config.compression);

            // Set the cache with the token collection
            const success = await this.set(cacheKey, tokens, ttlSeconds);

            const buildTimeMs = Date.now() - startTime;
            this.updateAverageBuildTime(buildTimeMs);

            if (success) {
                return {
                    success: true,
                    itemsCached: tokens.length,
                    totalSize: compressionResult.originalSize,
                    compressionRatio: compressionResult.compressionRatio,
                    buildTimeMs,
                };
            } else {
                return {
                    success: false,
                    itemsCached: 0,
                    totalSize: 0,
                    compressionRatio: 1.0,
                    buildTimeMs,
                    error: "Failed to store in cache",
                };
            }
        } catch (error) {
            this.stats.totalErrors++;
            const buildTimeMs = Date.now() - startTime;

            return {
                success: false,
                itemsCached: 0,
                totalSize: 0,
                compressionRatio: 1.0,
                buildTimeMs,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    /**
     * Check if cache is healthy and available
     */
    async healthCheck(): Promise<boolean> {
        try {
            if (!this.canUseRedis()) {
                return false;
            }

            const result = await this.execRedis(() => this.redis!.ping());
            return result === "PONG";
        } catch (error) {
            console.error("Cache health check failed:", error);
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Reset cache statistics
     */
    resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalRequests: 0,
            totalCacheBuilds: 0,
            totalErrors: 0,
            averageBuildTimeMs: 0,
        };
    }

    /**
     * Update hit rate calculation
     */
    private updateHitRate(): void {
        if (this.stats.totalRequests > 0) {
            this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
        }
    }

    /**
     * Update average build time
     */
    private updateAverageBuildTime(newBuildTime: number): void {
        if (this.stats.totalCacheBuilds === 1) {
            this.stats.averageBuildTimeMs = newBuildTime;
        } else {
            // Calculate running average
            this.stats.averageBuildTimeMs =
                (this.stats.averageBuildTimeMs * (this.stats.totalCacheBuilds - 1) + newBuildTime) /
                this.stats.totalCacheBuilds;
        }
    }

    // ===== GALLERY-SPECIFIC CACHE METHODS (NEW) =====

    /**
     * Get cached USER gallery tokens
     */
    async getUserTokens(address: string, filterHash: string): Promise<CacheResult<UnifiedToken[]>> {
        const cacheKey = userCollection(address, filterHash);
        return this.get<UnifiedToken[]>(cacheKey);
    }

    /**
     * Set cached USER gallery tokens
     */
    async setUserTokens(address: string, tokens: UnifiedToken[], filterHash: string): Promise<CacheBuildResult> {
        const cacheKey = userCollection(address, filterHash);
        const ttlSeconds = 3600; // 1 hour for user galleries
        return this.buildCache(cacheKey, tokens, ttlSeconds);
    }

    /**
     * Get cached CURATION gallery tokens
     */
    async getCurationTokens(curationId: string, filterHash: string): Promise<CacheResult<UnifiedToken[]>> {
        const cacheKey = curationCollection(curationId, filterHash);
        return this.get<UnifiedToken[]>(cacheKey);
    }

    /**
     * Set cached CURATION gallery tokens
     */
    async setCurationTokens(curationId: string, tokens: UnifiedToken[], filterHash: string): Promise<CacheBuildResult> {
        const cacheKey = curationCollection(curationId, filterHash);
        const ttlSeconds = 7200; // 2 hours for curations (rarely change)
        return this.buildCache(cacheKey, tokens, ttlSeconds);
    }

    /**
     * Get cached COLLECTION gallery tokens (contract-based)
     */
    async getCollectionTokens(contractAddress: string, filterHash: string): Promise<CacheResult<UnifiedToken[]>> {
        const cacheKey = contractCollection(contractAddress, filterHash);
        return this.get<UnifiedToken[]>(cacheKey);
    }

    /**
     * Set cached COLLECTION gallery tokens (contract-based)
     */
    async setCollectionTokens(
        contractAddress: string,
        tokens: UnifiedToken[],
        filterHash: string
    ): Promise<CacheBuildResult> {
        const cacheKey = contractCollection(contractAddress, filterHash);
        const ttlSeconds = 1800; // 30 minutes for collections (contracts mint frequently)
        return this.buildCache(cacheKey, tokens, ttlSeconds);
    }

    /**
     * Gallery-specific cache invalidation methods
     */

    /**
     * Clear all cache for a USER gallery (all filter variations)
     */
    async clearUserCache(address: string): Promise<number> {
        const pattern = `tokens:user:${address}:*`;
        return this.invalidatePattern(pattern);
    }

    /**
     * Clear all cache for a CURATION gallery (all filter variations)
     */
    async clearCurationCache(curationId: string): Promise<number> {
        const pattern = `*:curation:${curationId}:*`;
        return this.invalidatePattern(pattern);
    }

    /**
     * Clear all cache for a COLLECTION gallery (all filter variations)
     */
    async clearCollectionCache(contractAddress: string): Promise<number> {
        const pattern = `*:collection:${contractAddress}:*`;
        return this.invalidatePattern(pattern);
    }

    /**
     * Clear all cache for a specific gallery type and identifier
     */
    async clearGalleryCache(galleryType: "USER" | "CURATION" | "COLLECTION", identifier: string): Promise<number> {
        switch (galleryType) {
            case "USER":
                return this.clearUserCache(identifier);
            case "CURATION":
                return this.clearCurationCache(identifier);
            case "COLLECTION":
                return this.clearCollectionCache(identifier);
            default:
                console.warn(`Unknown gallery type: ${galleryType}`);
                return 0;
        }
    }
}

// Export singleton instance
export const cacheManager = new CacheManager();
