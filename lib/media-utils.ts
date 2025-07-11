/**
 * Smart Media Type Detection Utilities
 *
 * Comprehensive MIME type detection with multiple fallback strategies
 */

import { UnifiedMetadata } from "./data/types/token-types";

export interface MediaTypeResult {
    mimeType: string;
    mediaCategory: "image" | "video" | "audio" | "html" | "3d" | "unknown";
    confidence: number; // 0-1, higher is better
    source: "formats" | "extension" | "content-type" | "heuristic" | "unknown";
    uri?: string; // The URI that matches this MIME type (when available)
}

/**
 * Get priority score for different MIME types
 * Higher score = higher priority for display
 */
function getFormatPriorityScore(mimeType?: string): number {
    if (!mimeType) return 0;

    const type = mimeType.toLowerCase();

    // Prioritize animated content
    if (type.includes("gif")) return 100; // GIFs have highest priority
    if (type.startsWith("video/")) return 90; // Videos second
    if (type.includes("html")) return 80; // Interactive HTML third
    if (type.startsWith("audio/")) return 70; // Audio content
    if (type.startsWith("image/")) return 50; // Static images lower priority

    return 10; // Unknown types get low priority
}

/**
 * Extract MIME type from UnifiedMetadata with smart fallbacks
 */
export function detectMediaType(metadata: UnifiedMetadata, uri?: string): MediaTypeResult {
    // Strategy 1: Use formats array if available - PRIORITIZE ANIMATED CONTENT
    if (metadata.formats && metadata.formats.length > 0) {
        // Priority order: GIF > Video > Other formats
        const prioritizedFormats = [...metadata.formats].sort((a, b) => {
            const aScore = getFormatPriorityScore(a.mimeType);
            const bScore = getFormatPriorityScore(b.mimeType);
            return bScore - aScore; // Higher score first
        });

        const bestFormat = prioritizedFormats[0];
        if (bestFormat.mimeType) {
            console.log("🎯 MEDIA DETECTION - Format priority selection:", {
                totalFormats: metadata.formats.length,
                selectedFormat: bestFormat,
                allFormats: metadata.formats,
                priorityScores: metadata.formats.map((f) => ({
                    mimeType: f.mimeType,
                    score: getFormatPriorityScore(f.mimeType),
                    uri: f.uri,
                })),
            });

            return {
                mimeType: bestFormat.mimeType,
                mediaCategory: categorizeMediaType(bestFormat.mimeType),
                confidence: 0.95,
                source: "formats",
                uri: bestFormat.uri, // 🔥 CRITICAL: Return the URI for the BEST format, not just first
            };
        }
    }

    // Strategy 2: Check all possible URIs for file extensions
    const uris = [uri, metadata.artifactUri, metadata.displayUri, metadata.image, metadata.thumbnailUri].filter(
        Boolean
    ) as string[];

    for (const testUri of uris) {
        const extensionResult = detectFromExtension(testUri);
        if (extensionResult.confidence > 0.7) {
            return {
                ...extensionResult,
                uri: testUri, // Return the URI that matched
            };
        }
    }

    // Strategy 3: Heuristic detection from URI patterns
    for (const testUri of uris) {
        const heuristicResult = detectFromHeuristics(testUri);
        if (heuristicResult.confidence > 0.5) {
            return {
                ...heuristicResult,
                uri: testUri, // Return the URI that matched
            };
        }
    }

    // Strategy 4: Last resort - unknown
    return {
        mimeType: "application/octet-stream",
        mediaCategory: "unknown",
        confidence: 0.1,
        source: "unknown",
        uri: uri, // Use provided URI as fallback
    };
}

/**
 * Detect media type from file extension
 */
function detectFromExtension(uri: string): MediaTypeResult {
    if (!uri) {
        return {
            mimeType: "application/octet-stream",
            mediaCategory: "unknown",
            confidence: 0,
            source: "extension",
            uri: uri,
        };
    }

    const lowerUri = uri.toLowerCase();

    // Video extensions
    if (lowerUri.includes(".mp4")) {
        return { mimeType: "video/mp4", mediaCategory: "video", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".webm")) {
        return { mimeType: "video/webm", mediaCategory: "video", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".mov")) {
        return { mimeType: "video/quicktime", mediaCategory: "video", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".avi")) {
        return { mimeType: "video/x-msvideo", mediaCategory: "video", confidence: 0.9, source: "extension", uri };
    }

    // Audio extensions
    if (lowerUri.includes(".mp3")) {
        return { mimeType: "audio/mpeg", mediaCategory: "audio", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".wav")) {
        return { mimeType: "audio/wav", mediaCategory: "audio", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".ogg")) {
        return { mimeType: "audio/ogg", mediaCategory: "audio", confidence: 0.9, source: "extension", uri };
    }

    // Image extensions
    if (lowerUri.includes(".jpg") || lowerUri.includes(".jpeg")) {
        return { mimeType: "image/jpeg", mediaCategory: "image", confidence: 0.8, source: "extension", uri };
    }
    if (lowerUri.includes(".png")) {
        return { mimeType: "image/png", mediaCategory: "image", confidence: 0.8, source: "extension", uri };
    }
    if (lowerUri.includes(".gif")) {
        return { mimeType: "image/gif", mediaCategory: "image", confidence: 0.8, source: "extension", uri };
    }
    if (lowerUri.includes(".webp")) {
        return { mimeType: "image/webp", mediaCategory: "image", confidence: 0.8, source: "extension", uri };
    }
    if (lowerUri.includes(".svg")) {
        return { mimeType: "image/svg+xml", mediaCategory: "image", confidence: 0.8, source: "extension", uri };
    }

    // 3D model extensions
    if (lowerUri.includes(".glb")) {
        return { mimeType: "model/gltf-binary", mediaCategory: "3d", confidence: 0.9, source: "extension", uri };
    }
    if (lowerUri.includes(".gltf")) {
        return { mimeType: "model/gltf+json", mediaCategory: "3d", confidence: 0.9, source: "extension", uri };
    }

    // HTML/Interactive content
    if (lowerUri.includes(".html")) {
        return { mimeType: "text/html", mediaCategory: "html", confidence: 0.9, source: "extension", uri };
    }

    return {
        mimeType: "application/octet-stream",
        mediaCategory: "unknown",
        confidence: 0.2,
        source: "extension",
        uri,
    };
}

/**
 * Detect media type from URI patterns and heuristics
 */
function detectFromHeuristics(uri: string): MediaTypeResult {
    if (!uri) {
        return {
            mimeType: "application/octet-stream",
            mediaCategory: "unknown",
            confidence: 0,
            source: "heuristic",
            uri,
        };
    }

    const lowerUri = uri.toLowerCase();

    // HTML content indicators
    const htmlIndicators = ["<html", "<!doctype", "text/html"];
    if (htmlIndicators.some((indicator) => lowerUri.includes(indicator))) {
        return { mimeType: "text/html", mediaCategory: "html", confidence: 0.7, source: "heuristic", uri };
    }

    // IPFS CIDs that commonly contain videos (pattern-based)
    if (uri.startsWith("ipfs://") && uri.length > 50) {
        // Longer CIDs often indicate larger files like videos
        return { mimeType: "video/mp4", mediaCategory: "video", confidence: 0.3, source: "heuristic", uri };
    }

    // Data URIs
    if (uri.startsWith("data:")) {
        const mimeMatch = uri.match(/^data:([^;]+)/);
        if (mimeMatch) {
            return {
                mimeType: mimeMatch[1],
                mediaCategory: categorizeMediaType(mimeMatch[1]),
                confidence: 0.95,
                source: "heuristic",
                uri,
            };
        }
    }

    return {
        mimeType: "application/octet-stream",
        mediaCategory: "unknown",
        confidence: 0.1,
        source: "heuristic",
        uri,
    };
}

/**
 * Categorize MIME type into broad media categories
 */
function categorizeMediaType(mimeType: string): "image" | "video" | "audio" | "html" | "3d" | "unknown" {
    if (!mimeType) return "unknown";

    const lower = mimeType.toLowerCase();

    if (lower.startsWith("image/")) return "image";
    if (lower.startsWith("video/")) return "video";
    if (lower.startsWith("audio/")) return "audio";
    if (lower.includes("html")) return "html";
    if (lower.startsWith("model/")) return "3d";

    return "unknown";
}

/**
 * Async function to fetch content-type header (for future enhancement)
 */
export async function fetchContentType(uri: string): Promise<string | null> {
    try {
        // Convert IPFS URI to gateway URL
        let fetchUri = uri;
        if (uri.startsWith("ipfs://")) {
            const cid = uri.replace("ipfs://", "");
            fetchUri = `https://ipfs.fileship.xyz/${cid}`;
        }

        const response = await fetch(fetchUri, {
            method: "HEAD",
            mode: "cors",
        });

        return response.headers.get("content-type");
    } catch (error) {
        console.warn("Failed to fetch content-type for:", uri, error);
        return null;
    }
}
