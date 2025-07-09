/**
 * Cache Types
 *
 * Type definitions for Redis cache keys, metadata, and cache entry structures
 */

import type { DataSource, UnifiedToken, UnifiedCollection, FilterResult } from "./token-types";

/**
 * Cache key patterns for different data types
 */
export interface CacheKeyPatterns {
    // Token collections by address
    tokenCollection: `tokens:${string}`; // tokens:tz1ABC...

    // Filtered collections
    filteredCollection: `filtered:${string}:${string}`; // filtered:tz1ABC...:filter-hash

    // Domain lookups
    domainByAddress: `domain:addr:${string}`; // domain:addr:tz1ABC...
    domainByName: `domain:name:${string}`; // domain:name:example.tez

    // Collection metadata
    collectionMeta: `meta:${string}`; // meta:tz1ABC...

    // Provider health status
    providerHealth: `health:${string}`; // health:tzkt

    // Filter rule cache
    filterRules: `filters:rules`;

    // Usage statistics
    usageStats: `stats:${string}:${string}`; // stats:daily:2025-07-08
}

/**
 * Cache key builder utilities
 */
export function tokenCollection(address: string): string {
    return `tokens:${address}`;
}

export function filteredCollection(address: string, filterHash: string): string {
    return `filtered:${address}:${filterHash}`;
}

export function domainByAddress(address: string): string {
    return `domain:addr:${address}`;
}

export function domainByName(name: string): string {
    return `domain:name:${name}`;
}

export function collectionMeta(address: string): string {
    return `meta:${address}`;
}

export function providerHealth(provider: string): string {
    return `health:${provider}`;
}

export function generateFilterHash(filters: Record<string, any>): string {
    // Create deterministic hash from filter object
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return Buffer.from(filterString).toString("base64url").slice(0, 16);
}

/**
 * Cache metadata for tracking cache entry information
 */
export interface CacheMetadata {
    // Timestamps
    createdAt: Date;
    expiresAt: Date;
    lastAccessedAt: Date;

    // Data source information
    sources: DataSource[];

    // Content information
    contentType: "tokens" | "domains" | "collection" | "metadata";
    version: string;

    // Compression information
    isCompressed: boolean;
    originalSize?: number;
    compressedSize?: number;

    // Quality metrics
    itemCount: number;
    completeness: number; // 0-1

    // Cache hit information
    hitCount: number;
    lastHitAt?: Date;

    // Build information (for filtered collections)
    buildDuration?: number;
    filteringApplied?: FilterResult;
}

/**
 * Generic cache entry wrapper
 */
export interface CacheEntry<T = any> {
    key: string;
    data: T;
    metadata: CacheMetadata;

    // Redis-specific fields
    ttl?: number; // Time to live in seconds
    size?: number; // Size in bytes
}

/**
 * Specialized cache entry types
 */
export interface TokenCollectionCacheEntry extends CacheEntry<UnifiedToken[]> {
    metadata: CacheMetadata & {
        contentType: "tokens";
        address: string;
        totalTokens: number;
        hasFiltering: boolean;
    };
}

export interface CollectionMetaCacheEntry extends CacheEntry<UnifiedCollection> {
    metadata: CacheMetadata & {
        contentType: "collection";
        address: string;
    };
}

export interface DomainCacheEntry extends CacheEntry<import("./token-types").UnifiedDomain[]> {
    metadata: CacheMetadata & {
        contentType: "domains";
        lookupType: "address" | "name";
        lookupValue: string;
    };
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
    // Redis connection
    redisUrl?: string;
    keyPrefix?: string;

    // Default TTL values (in seconds)
    ttl: {
        tokens: number; // 1 hour default
        domains: number; // 24 hours default
        collections: number; // 6 hours default
        health: number; // 5 minutes default
        filters: number; // 12 hours default
    };

    // Compression settings
    compression: {
        enabled: boolean;
        threshold: number; // Compress if larger than N bytes
        algorithm: "gzip" | "brotli";
    };

    // Cache limits
    limits: {
        maxKeyLength: number;
        maxValueSize: number; // In bytes
        maxTotalMemory: number; // In bytes
    };

    // Cleanup and maintenance
    cleanup: {
        enableAutoExpiry: boolean;
        enableLRUEviction: boolean;
        cleanupInterval: number; // In seconds
    };
}

/**
 * Cache operation result
 */
export interface CacheOperationResult {
    success: boolean;
    key: string;
    operation: "get" | "set" | "delete" | "exists" | "expire";

    // Timing information
    duration: number; // In milliseconds

    // Result data
    hit?: boolean;
    size?: number;
    compressed?: boolean;

    // Error information
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Cache statistics and monitoring
 */
export interface CacheStats {
    // Hit ratios
    hitRate: number;
    missRate: number;
    totalRequests: number;

    // Memory usage
    usedMemory: number;
    totalMemory: number;
    memoryUtilization: number;

    // Key statistics
    totalKeys: number;
    keysByType: Record<string, number>;

    // Performance metrics
    averageResponseTime: number;
    slowestOperations: Array<{
        operation: string;
        key: string;
        duration: number;
        timestamp: Date;
    }>;

    // Expiry and cleanup
    expiredKeys: number;
    evictedKeys: number;

    // Compression statistics
    compressionRatio: number;
    compressedKeys: number;

    // Collection timestamp
    collectedAt: Date;
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
    // Popular addresses to pre-warm
    popularAddresses: string[];

    // Warming schedule
    schedule: {
        enabled: boolean;
        intervalHours: number;
        maxConcurrent: number;
    };

    // Warming priorities
    priorities: {
        recentlyViewed: number;
        highTraffic: number;
        featured: number;
    };
}

/**
 * Cache invalidation rules
 */
export interface CacheInvalidationRule {
    pattern: string; // Key pattern to match
    triggers: Array<"time" | "data_change" | "manual">;
    conditions?: {
        maxAge?: number; // In seconds
        dataSource?: string;
        userTriggered?: boolean;
    };
}

/**
 * Error types for cache operations
 */
export class CacheError extends Error {
    public readonly operation: string;
    public readonly key?: string;
    public readonly originalError?: Error;

    constructor(message: string, operation: string, key?: string, originalError?: Error) {
        super(message);
        this.name = "CacheError";
        this.operation = operation;
        this.key = key;
        this.originalError = originalError;
    }
}

export class CacheCompressionError extends CacheError {
    constructor(message: string, key: string, originalError?: Error) {
        super(message, "compression", key, originalError);
        this.name = "CacheCompressionError";
    }
}

export class CacheConnectionError extends CacheError {
    constructor(message: string, originalError?: Error) {
        super(message, "connection", undefined, originalError);
        this.name = "CacheConnectionError";
    }
}
