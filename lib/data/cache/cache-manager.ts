/**
 * Cache Manager - Main orchestrator for cache operations
 *
 * Handles cache hit/miss logic, TTL management, compression, and cache invalidation.
 * Server-side only with direct Redis integration.
 */

import { Redis } from "@upstash/redis";
import { compressData, decompressData, CompressionConfig, DEFAULT_COMPRESSION_CONFIG } from "../utils/compression";
import { CacheMetadata, TokenCollectionCacheEntry } from "../types/cache-types";
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

        // Initialize Redis connection (server-side only)
        this.isConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

        if (this.isConfigured) {
            this.redis = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            });
        }
    }

    /**
     * Get cached data with automatic decompression
     */
    async get<T>(cacheKey: string): Promise<CacheResult<T>> {
        this.stats.totalRequests++;

        try {
            // Check if cache is available
            if (!this.isConfigured || !this.redis) {
                this.stats.misses++;
                this.updateHitRate();
                return {
                    data: null,
                    hit: false,
                    error: "Cache not available",
                };
            }

            // Attempt to get from cache - stored as Buffer if compressed
            const cached = await this.redis.get(cacheKey);

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
            if (!this.isConfigured || !this.redis) {
                console.warn("Cache not available, skipping set operation");
                return false;
            }

            // Compress the data
            const compressionResult = await compressData(data, this.config.compression);

            // Store the compressed data directly in Redis
            await this.redis.setex(cacheKey, ttlSeconds, compressionResult.data);

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
            if (!this.isConfigured || !this.redis) {
                return false;
            }

            const result = await this.redis.del(cacheKey);
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
            if (!this.isConfigured || !this.redis) {
                return 0;
            }

            // Get all keys matching the pattern
            const keys = await this.redis.keys(pattern);

            if (keys.length === 0) {
                return 0;
            }

            // Delete all matching keys
            const result = await this.redis.del(...keys);
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
            if (!this.isConfigured || !this.redis) {
                return false;
            }

            const result = await this.redis.ping();
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
}

// Export singleton instance
export const cacheManager = new CacheManager();
