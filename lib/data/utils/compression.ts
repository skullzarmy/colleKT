/**
 * Compression utilities for cache data
 *
 * Provides gzip compression and decompression for Redis cache values
 * to reduce memory usage and network transfer costs.
 * Uses base64 encoding for Redis storage compatibility.
 */

import zlib from "zlib";
import { promisify } from "util";

// Promisified compression functions
const gzipPromise = promisify(zlib.gzip);
const gunzipPromise = promisify(zlib.gunzip);

/**
 * Configuration for compression
 */
export interface CompressionConfig {
    enabled: boolean;
    threshold: number; // Compress if larger than N bytes
    level: number; // 1-9, higher = better compression but slower
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
    enabled: true,
    threshold: 1024, // 1KB threshold
    level: 6, // Balanced compression level
};

/**
 * Compression result metadata
 */
export interface CompressionResult {
    data: string; // Base64 encoded string for Redis storage
    isCompressed: boolean;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
}

/**
 * Compress data if it meets the threshold criteria
 */
export async function compressData(
    data: any,
    config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): Promise<CompressionResult> {
    // Serialize the data to JSON string first
    const jsonString = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonString, "utf-8");

    // Check if compression is enabled and data meets threshold
    if (!config.enabled || originalSize < config.threshold) {
        return {
            data: jsonString, // Return as plain JSON string
            isCompressed: false,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1.0,
        };
    }

    try {
        // Compress the data using your proven approach
        const compressedBuffer = await gzipPromise(jsonString);
        const compressedSize = compressedBuffer.length;
        const compressionRatio = compressedSize / originalSize;

        // Only use compression if it actually reduces size significantly
        if (compressionRatio > 0.9) {
            // Less than 10% savings, not worth the CPU overhead
            return {
                data: jsonString, // Return uncompressed JSON string
                isCompressed: false,
                originalSize,
                compressedSize: originalSize,
                compressionRatio: 1.0,
            };
        }

        // Convert compressed buffer to base64 string for Redis storage
        const compressedData = compressedBuffer.toString("base64");

        return {
            data: compressedData, // Base64 encoded compressed data
            isCompressed: true,
            originalSize,
            compressedSize,
            compressionRatio,
        };
    } catch (error) {
        console.warn("Compression failed, storing uncompressed:", error);
        return {
            data: jsonString, // Fallback to uncompressed JSON string
            isCompressed: false,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1.0,
        };
    }
}

/**
 * Decompress data if it was compressed
 * Accepts either base64 string (compressed) or plain JSON string (uncompressed)
 */
export async function decompressData(data: string, isCompressed: boolean): Promise<any> {
    try {
        let jsonString: string;

        if (isCompressed) {
            // Decompress the base64 encoded data (following your working approach)
            const decompressedBuffer = await gunzipPromise(Buffer.from(data, "base64"));
            jsonString = decompressedBuffer.toString("utf-8");
        } else {
            // Data is not compressed, use directly
            jsonString = data;
        }

        // Parse the JSON and return the original data
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Failed to decompress data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Utility to estimate compression ratio for a given data set
 * Useful for determining optimal compression thresholds
 */
export async function estimateCompressionRatio(data: any): Promise<number> {
    const result = await compressData(data, {
        enabled: true,
        threshold: 0, // Force compression regardless of size
        level: 6,
    });

    return result.compressionRatio;
}

/**
 * Compression statistics for monitoring
 */
export interface CompressionStats {
    totalOperations: number;
    compressionOperations: number;
    decompressionOperations: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageCompressionRatio: number;
    totalTimeSaved: number; // Estimated based on network transfer
    errors: number;
}

/**
 * Global compression statistics tracker (optional)
 */
class CompressionStatsTracker {
    private stats: CompressionStats = {
        totalOperations: 0,
        compressionOperations: 0,
        decompressionOperations: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageCompressionRatio: 1.0,
        totalTimeSaved: 0,
        errors: 0,
    };

    recordCompression(result: CompressionResult): void {
        this.stats.totalOperations++;
        this.stats.compressionOperations++;
        this.stats.totalOriginalSize += result.originalSize;
        this.stats.totalCompressedSize += result.compressedSize;

        // Recalculate average compression ratio
        this.stats.averageCompressionRatio = this.stats.totalCompressedSize / this.stats.totalOriginalSize;

        // Estimate time saved (assuming 1MB/s network transfer)
        const byteSaved = result.originalSize - result.compressedSize;
        this.stats.totalTimeSaved += byteSaved / (1024 * 1024); // seconds
    }

    recordDecompression(): void {
        this.stats.totalOperations++;
        this.stats.decompressionOperations++;
    }

    recordError(): void {
        this.stats.errors++;
    }

    getStats(): CompressionStats {
        return { ...this.stats };
    }

    reset(): void {
        this.stats = {
            totalOperations: 0,
            compressionOperations: 0,
            decompressionOperations: 0,
            totalOriginalSize: 0,
            totalCompressedSize: 0,
            averageCompressionRatio: 1.0,
            totalTimeSaved: 0,
            errors: 0,
        };
    }
}

// Export singleton stats tracker
export const compressionStats = new CompressionStatsTracker();

/**
 * Error classes for compression operations
 */
export class CompressionError extends Error {
    constructor(message: string, public readonly originalError?: Error) {
        super(message);
        this.name = "CompressionError";
    }
}

export class DecompressionError extends Error {
    constructor(message: string, public readonly originalError?: Error) {
        super(message);
        this.name = "DecompressionError";
    }
}
