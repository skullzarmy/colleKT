/**
 * Filter Rules Configuration - Source of truth for all token filtering
 *
 * Defines what tokens should be excluded from collections to improve user experience.
 * Applied client-side BEFORE caching to solve pagination issues.
 */

/**
 * Basic filtering configuration
 */
export interface BasicFilterConfig {
    requireMetadata: boolean; // Only tokens with metadata
    requirePositiveBalance: boolean; // Only tokens with balance > 0
    minimumBalance?: number; // Minimum balance threshold (default: 0)
    excludeUtilityTokens: boolean; // Exclude fungible/utility tokens
}

/**
 * Utility token filtering configuration
 */
export interface UtilityTokenFilterConfig {
    excludeShouldPreferSymbol: boolean; // Exclude tokens with shouldPreferSymbol=true
    excludeDecimalsAboveZero: boolean; // Exclude tokens with decimals > 0
    excludeHighSupply: number; // Exclude tokens with totalSupply > this value (0 = disabled)
}

/**
 * Metadata requirements configuration
 */
export interface MetadataFilterConfig {
    requireImage: boolean; // Require displayUri, artifactUri, image, or thumbnailUri
    requireName: boolean; // Require name field in metadata
}

/**
 * Complete filter configuration
 */
export interface FilterConfig {
    basic: BasicFilterConfig;
    utilityTokenFilters: UtilityTokenFilterConfig;
    metadata: MetadataFilterConfig;
    whitelistedContracts: string[]; // Always include these contracts (overrides blacklist)
    blacklistedContracts: string[]; // Never include these contracts
}

/**
 * Default filter configuration - Production settings
 */
export const FILTER_CONFIG: FilterConfig = {
    basic: {
        requireMetadata: true,
        requirePositiveBalance: true,
        minimumBalance: 0,
        excludeUtilityTokens: true,
    },
    utilityTokenFilters: {
        excludeShouldPreferSymbol: true, // Tezos standard for utility tokens
        excludeDecimalsAboveZero: true, // NFTs should have 0 decimals
        excludeHighSupply: 10000, // Exclude tokens with >10k supply (likely fungible)
    },
    metadata: {
        requireImage: false, // Don't require images (some valid NFTs may not have them)
        requireName: false, // Don't require names (some valid NFTs may not have them)
    },
    whitelistedContracts: [
        // Add specific contracts that should always be included
        // Format: "KT1..."
        // Example: "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton", // fxhash
    ],
    blacklistedContracts: [
        // veNFT contracts (voting escrow NFTs - utility tokens)
        "KT18kkvmUoefkdok5mrjU6fxsm7xmumy1NEw", // veNFT contract

        // Governance tokens disguised as NFTs
        "KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV", // Kolibri governance
        "KT1JBmbKbqTyKaD6ULGZGSBKirZOGZH8DkAS", // Quipu governance example
        "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS", // Tezos Domains

        // Common utility/coin contracts that show up as "NFTs"
        // Add more as discovered...
    ],
};

/**
 * Development/testing filter configuration - Less restrictive
 */
export const DEV_FILTER_CONFIG: FilterConfig = {
    basic: {
        requireMetadata: true,
        requirePositiveBalance: true,
        minimumBalance: 0,
        excludeUtilityTokens: false, // Show utility tokens in dev for debugging
    },
    utilityTokenFilters: {
        excludeShouldPreferSymbol: false,
        excludeDecimalsAboveZero: false,
        excludeHighSupply: 0, // Disabled
    },
    metadata: {
        requireImage: false,
        requireName: false,
    },
    whitelistedContracts: [],
    blacklistedContracts: [
        // Only the most obvious utility contracts in dev
        "KT18kkvmUoefkdok5mrjU6fxsm7xmumy1NEw", // veNFT
    ],
};

/**
 * Validate filter configuration
 */
export function validateFilterConfig(config: FilterConfig): void {
    // Validate basic config
    if (typeof config.basic.requireMetadata !== "boolean") {
        throw new Error("basic.requireMetadata must be boolean");
    }
    if (typeof config.basic.requirePositiveBalance !== "boolean") {
        throw new Error("basic.requirePositiveBalance must be boolean");
    }
    if (config.basic.minimumBalance !== undefined && config.basic.minimumBalance < 0) {
        throw new Error("basic.minimumBalance must be >= 0");
    }

    // Validate utility token filters
    if (typeof config.utilityTokenFilters.excludeShouldPreferSymbol !== "boolean") {
        throw new Error("utilityTokenFilters.excludeShouldPreferSymbol must be boolean");
    }
    if (typeof config.utilityTokenFilters.excludeDecimalsAboveZero !== "boolean") {
        throw new Error("utilityTokenFilters.excludeDecimalsAboveZero must be boolean");
    }
    if (config.utilityTokenFilters.excludeHighSupply < 0) {
        throw new Error("utilityTokenFilters.excludeHighSupply must be >= 0");
    }

    // Validate metadata config
    if (typeof config.metadata.requireImage !== "boolean") {
        throw new Error("metadata.requireImage must be boolean");
    }
    if (typeof config.metadata.requireName !== "boolean") {
        throw new Error("metadata.requireName must be boolean");
    }

    // Validate contract arrays
    if (!Array.isArray(config.whitelistedContracts)) {
        throw new Error("whitelistedContracts must be array");
    }
    if (!Array.isArray(config.blacklistedContracts)) {
        throw new Error("blacklistedContracts must be array");
    }

    // Validate contract addresses format (basic check for KT1 prefix and reasonable length)
    [...config.whitelistedContracts, ...config.blacklistedContracts].forEach((address) => {
        if (!address.startsWith("KT1") || address.length !== 36) {
            throw new Error(`Invalid contract address format: ${address} (must start with KT1 and be 36 characters)`);
        }
    });
}

/**
 * Get filter configuration based on environment
 */
export function getFilterConfig(): FilterConfig {
    const isDev = process.env.NODE_ENV === "development";
    return isDev ? DEV_FILTER_CONFIG : FILTER_CONFIG;
}

/**
 * Get filter summary for logging
 */
export function getFilterSummary(config: FilterConfig): string {
    const filters = [];

    if (config.basic.requireMetadata) filters.push("metadata");
    if (config.basic.requirePositiveBalance) filters.push("balance>0");
    if (config.basic.excludeUtilityTokens) filters.push("no-utility");
    if (config.metadata.requireImage) filters.push("image");
    if (config.metadata.requireName) filters.push("name");
    if (config.whitelistedContracts.length > 0) filters.push(`whitelist:${config.whitelistedContracts.length}`);
    if (config.blacklistedContracts.length > 0) filters.push(`blacklist:${config.blacklistedContracts.length}`);

    return filters.length > 0 ? filters.join(", ") : "no-filters";
}
