/**
 * Unified Token Types
 *
 * Standard interfaces that abstract away differences between data providers
 * (TzKT, Objkt, future sources) and provide consistent format for the cache layer
 */

/**
 * Supported token standards
 */
export type TokenStandard = "fa1.2" | "fa2" | "fa1.2-single-asset" | "fa2-single-asset" | "fa2-multi-asset" | "unknown";

/**
 * Data source identification
 */
export interface DataSource {
    provider: "tzkt" | "objkt" | "custom";
    version: string;
    endpoint: string;
    priority: number;
}

/**
 * Unified metadata format (normalized across providers)
 */
export interface UnifiedMetadata {
    // Core metadata fields
    name?: string;
    description?: string;
    symbol?: string;
    decimals?: number | string;

    // Media fields
    image?: string;
    artifactUri?: string;
    displayUri?: string;
    thumbnailUri?: string;

    // Media format information (CRITICAL for proper media detection)
    formats?: Array<{
        uri: string;
        mimeType: string;
        fileSize?: string | number;
        hash?: string;
        dimensions?: {
            width?: number;
            height?: number;
        };
    }>;

    // Additional metadata
    creators?: string[];
    tags?: string[];
    attributes?: Array<{
        trait_type: string;
        value: string | number;
    }>;

    // Supply information
    supply?: number | string;

    // Utility token indicators
    shouldPreferSymbol?: boolean;
    isUtilityToken?: boolean;

    // Raw metadata for debugging
    raw?: Record<string, any>;

    // Metadata completeness score (0-1)
    completeness?: number;
}

/**
 * Unified token representation
 */
export interface UnifiedToken {
    // Unique identifier (provider-specific format)
    id: string;

    // Contract information
    contractAddress: string;
    contractAlias?: string; // ← ADD contract alias field
    tokenId: string;

    // Balance information
    balance: string;
    balanceNormalized?: number; // For display purposes

    // Token classification
    standard: TokenStandard;

    // Metadata
    metadata: UnifiedMetadata;

    // Source tracking
    source: DataSource;
    fetchedAt: Date;

    // Additional fields for filtering/sorting
    lastTransferAt?: Date;
    firstMintAt?: Date;
    transferCount?: number;

    // Computed fields for gallery
    displayImage?: string; // Best image URL for display
    displayName?: string; // Best name for display
    sortKey?: string; // For chronological sorting

    // Quality indicators
    isValid: boolean; // Passed basic validation
    hasImage: boolean; // Has displayable image
    hasMetadata: boolean; // Has any metadata
}

/**
 * Unified domain representation
 */
export interface UnifiedDomain {
    // Domain information
    name: string;

    // Address relationships
    ownerAddress?: string;
    resolvedAddress?: string;

    // Domain properties
    isPrimary?: boolean; // Is this the primary domain for the address
    isReverse?: boolean; // Is this a reverse lookup result

    // Timestamps
    registeredAt?: Date;
    expiresAt?: Date;
    lastUpdatedAt?: Date;

    // Source tracking
    source: DataSource;
    fetchedAt: Date;

    // Additional metadata
    metadata?: Record<string, any>;
}

/**
 * Token collection summary (for gallery overview)
 */
export interface UnifiedCollection {
    address: string;
    totalTokens: number;
    totalWithMetadata: number;
    totalWithImages: number;

    // Collection metadata
    primaryDomain?: string;
    displayName?: string;

    // Content breakdown
    standardsBreakdown: Record<TokenStandard, number>;
    topContracts: Array<{
        address: string;
        count: number;
        name?: string;
    }>;

    // Quality metrics
    metadataCompleteness: number; // 0-1
    imageAvailability: number; // 0-1

    // Timestamps
    lastFetchedAt: Date;
    oldestToken?: Date;
    newestToken?: Date;

    // Sources that contributed to this collection
    sources: DataSource[];
}

/**
 * Filter result metadata
 */
export interface FilterResult {
    totalBefore: number;
    totalAfter: number;
    filtersApplied: string[];
    excludedReasons: Record<string, number>; // reason -> count
    executionTime: number;
}

/**
 * Helper type for token transformations
 */
export interface TokenTransform {
    from: "tzkt" | "objkt" | "raw";
    to: "unified";
    metadata: {
        transformedAt: Date;
        transformVersion: string;
        originalFormat?: string;
    };
}

/**
 * Token validation result
 */
export interface TokenValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number; // 0-1, higher is better
    checks: {
        hasRequiredFields: boolean;
        hasValidMetadata: boolean;
        hasDisplayableImage: boolean;
        hasReadableName: boolean;
        isNotUtilityToken: boolean;
    };
}

/**
 * Helper functions for working with unified types
 */

/**
 * Extract the best display image from token metadata
 */
export function getDisplayImage(token: UnifiedToken): string | undefined {
    const { metadata } = token;
    return metadata.displayUri || metadata.artifactUri || metadata.thumbnailUri || metadata.image;
}

/**
 * Extract the best display name from token metadata
 */
export function getDisplayName(token: UnifiedToken): string {
    const { metadata, contractAddress, tokenId } = token;
    return metadata.name || metadata.symbol || `${contractAddress.slice(0, 8)}...#${tokenId}`;
}

/**
 * Check if token should be considered a utility token
 */
export function isUtilityToken(token: UnifiedToken): boolean {
    const { metadata } = token;

    // Explicit flag
    if (metadata.isUtilityToken) return true;

    // High supply indicator
    if (metadata.supply && Number(metadata.supply) > 500000) return true;

    // High decimals indicator
    if (metadata.decimals && Number(metadata.decimals) > 0) return true;

    // Should prefer symbol indicator
    if (metadata.shouldPreferSymbol) return true;

    return false;
}

/**
 * Calculate metadata completeness score
 */
export function calculateCompletenessScore(token: UnifiedToken): number {
    const { metadata } = token;
    let score = 0;
    let maxScore = 0;

    // Core fields (weighted higher)
    maxScore += 2;
    if (metadata.name) score += 2;

    maxScore += 2;
    if (metadata.description) score += 2;

    // Image fields
    maxScore += 1;
    if (metadata.image || metadata.displayUri || metadata.artifactUri) score += 1;

    // Additional metadata
    maxScore += 1;
    if (metadata.attributes && metadata.attributes.length > 0) score += 1;

    maxScore += 1;
    if (metadata.creators && metadata.creators.length > 0) score += 1;

    return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Generate a sort key for chronological ordering
 */
export function generateSortKey(token: UnifiedToken): string {
    // Use first mint timestamp, fall back to fetch time
    const timestamp = token.firstMintAt || token.fetchedAt;
    return `${timestamp.getTime()}-${token.contractAddress}-${token.tokenId}`;
}
