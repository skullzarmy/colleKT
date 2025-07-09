/**
 * Filter Engine - Apply filtering rules to token collections
 *
 * Handles client-side filtering of UnifiedToken arrays using the existing filter-rules.ts configuration.
 * This solves the pagination issue by allowing us to filter complete collections rather than
 * relying on server-side filtering which breaks pagination.
 */

import { UnifiedToken } from "../types/token-types";
import { FILTER_CONFIG, FilterConfig, validateFilterConfig } from "../config/filter-rules";

/**
 * Filter application result with metadata
 */
export interface FilterResult {
    filteredTokens: UnifiedToken[];
    originalCount: number;
    filteredCount: number;
    filterStats: {
        removedByMetadata: number;
        removedByBalance: number;
        removedByUtilityRules: number;
        removedByContract: number;
        removedByImageRequirement: number;
        removedByNameRequirement: number;
    };
    filtersApplied: string[];
    filterHash: string; // Hash of applied filter configuration
}

/**
 * Individual filter functions for modular testing
 */
export class TokenFilters {
    /**
     * Filter tokens that require metadata
     */
    static requireMetadata(tokens: UnifiedToken[]): UnifiedToken[] {
        return tokens.filter((token) => token.metadata !== null && token.metadata !== undefined);
    }

    /**
     * Filter tokens by minimum balance requirement
     */
    static requirePositiveBalance(tokens: UnifiedToken[], minimumBalance: number = 0): UnifiedToken[] {
        const result = tokens.filter((token, index) => {
            const balance = Number(token.balance) || 0;
            const passes = balance > minimumBalance;

            return passes;
        });

        return result;
    }

    /**
     * Filter out utility tokens based on metadata patterns
     */
    static excludeUtilityTokens(tokens: UnifiedToken[], config: FilterConfig["utilityTokenFilters"]): UnifiedToken[] {
        return tokens.filter((token) => {
            const metadata = token.metadata;

            if (!metadata) return true; // Keep if no metadata to check

            // Check shouldPreferSymbol flag (Tezos standard for utility tokens)
            if (config.excludeShouldPreferSymbol && metadata.shouldPreferSymbol === true) {
                return false;
            }

            // Check decimals - utility tokens often have > 0 decimals
            if (config.excludeDecimalsAboveZero) {
                const decimals = metadata.decimals;
                if (decimals !== null && decimals !== undefined && Number(decimals) > 0) {
                    return false;
                }
            }

            // Check high supply - fungible/utility tokens often have high supply
            // Note: totalSupply not available in current UnifiedToken/UnifiedMetadata interface
            // TODO: Add totalSupply field when available from data sources
            // if (config.excludeHighSupply > 0 && metadata.totalSupply) {
            //     const supply = Number(metadata.totalSupply) || 0;
            //     if (supply > config.excludeHighSupply) {
            //         return false;
            //     }
            // }

            return true;
        });
    }

    /**
     * Filter by contract whitelist/blacklist
     */
    static filterByContracts(tokens: UnifiedToken[], whitelist: string[], blacklist: string[]): UnifiedToken[] {
        return tokens.filter((token) => {
            const contractAddress = token.contractAddress;

            // If whitelist is populated, ONLY allow whitelisted contracts
            if (whitelist.length > 0) {
                return whitelist.includes(contractAddress);
            }

            // Otherwise, exclude blacklisted contracts
            if (blacklist.length > 0) {
                return !blacklist.includes(contractAddress);
            }

            // No filtering if neither list is populated
            return true;
        });
    }

    /**
     * Filter tokens that require image metadata
     */
    static requireImage(tokens: UnifiedToken[]): UnifiedToken[] {
        return tokens.filter((token) => {
            const metadata = token.metadata;
            return metadata && (metadata.image || metadata.artifactUri || metadata.displayUri || metadata.thumbnailUri);
        });
    }

    /**
     * Filter tokens that require name metadata
     */
    static requireName(tokens: UnifiedToken[]): UnifiedToken[] {
        return tokens.filter((token) => {
            const metadata = token.metadata;
            return metadata && metadata.name && metadata.name.trim().length > 0;
        });
    }
}

/**
 * Main filter engine class
 */
export class FilterEngine {
    private config: FilterConfig;

    constructor(config: FilterConfig = FILTER_CONFIG) {
        validateFilterConfig(config);
        this.config = config;
    }

    /**
     * Apply all configured filters to a token array
     */
    applyFilters(tokens: UnifiedToken[]): FilterResult {
        const originalCount = tokens.length;
        let currentTokens = [...tokens]; // Copy to avoid mutation
        const filtersApplied: string[] = [];

        // Initialize filter stats
        const filterStats = {
            removedByMetadata: 0,
            removedByBalance: 0,
            removedByUtilityRules: 0,
            removedByContract: 0,
            removedByImageRequirement: 0,
            removedByNameRequirement: 0,
        };

        // Apply metadata requirement filter
        if (this.config.basic.requireMetadata) {
            const beforeCount = currentTokens.length;
            currentTokens = TokenFilters.requireMetadata(currentTokens);
            filterStats.removedByMetadata = beforeCount - currentTokens.length;
            if (filterStats.removedByMetadata > 0) {
                filtersApplied.push("requireMetadata");
            }
        }

        // Apply balance requirement filter
        if (this.config.basic.requirePositiveBalance) {
            const beforeCount = currentTokens.length;
            currentTokens = TokenFilters.requirePositiveBalance(currentTokens, this.config.basic.minimumBalance || 0);
            filterStats.removedByBalance = beforeCount - currentTokens.length;
            if (filterStats.removedByBalance > 0) {
                filtersApplied.push("requirePositiveBalance");
            }
        }

        // Apply utility token filters
        if (this.config.basic.excludeUtilityTokens) {
            const beforeCount = currentTokens.length;
            currentTokens = TokenFilters.excludeUtilityTokens(currentTokens, this.config.utilityTokenFilters);
            filterStats.removedByUtilityRules = beforeCount - currentTokens.length;

            if (filterStats.removedByUtilityRules > 0) {
                filtersApplied.push("excludeUtilityTokens");
            }
        }

        // Apply contract filtering
        const beforeContractCount = currentTokens.length;
        currentTokens = TokenFilters.filterByContracts(
            currentTokens,
            this.config.whitelistedContracts,
            this.config.blacklistedContracts
        );
        filterStats.removedByContract = beforeContractCount - currentTokens.length;
        if (filterStats.removedByContract > 0) {
            if (this.config.whitelistedContracts.length > 0) {
                filtersApplied.push("contractWhitelist");
            } else if (this.config.blacklistedContracts.length > 0) {
                filtersApplied.push("contractBlacklist");
            }
        }

        // Apply image requirement filter
        if (this.config.metadata.requireImage) {
            const beforeCount = currentTokens.length;
            currentTokens = TokenFilters.requireImage(currentTokens);
            filterStats.removedByImageRequirement = beforeCount - currentTokens.length;
            if (filterStats.removedByImageRequirement > 0) {
                filtersApplied.push("requireImage");
            }
        }

        // Apply name requirement filter
        if (this.config.metadata.requireName) {
            const beforeCount = currentTokens.length;
            currentTokens = TokenFilters.requireName(currentTokens);
            filterStats.removedByNameRequirement = beforeCount - currentTokens.length;
            if (filterStats.removedByNameRequirement > 0) {
                filtersApplied.push("requireName");
            }
        }

        // Generate filter hash for caching
        const filterHash = this.generateFilterHash();

        return {
            filteredTokens: currentTokens,
            originalCount,
            filteredCount: currentTokens.length,
            filterStats,
            filtersApplied,
            filterHash,
        };
    }

    /**
     * Update filter configuration
     */
    updateConfig(newConfig: Partial<FilterConfig>): void {
        this.config = { ...this.config, ...newConfig };
        validateFilterConfig(this.config);
    }

    /**
     * Get current filter configuration
     */
    getConfig(): FilterConfig {
        return { ...this.config };
    }

    /**
     * Generate a hash of the current filter configuration for cache keys
     */
    generateFilterHash(): string {
        const configString = JSON.stringify(this.config, Object.keys(this.config).sort());
        // Use base64 and make it URL-safe manually (base64url isn't supported in all Node versions)
        return Buffer.from(configString)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "")
            .slice(0, 16);
    }

    /**
     * Check if filters would affect a token collection (for performance optimization)
     */
    hasActiveFilters(): boolean {
        return (
            this.config.basic.requireMetadata ||
            this.config.basic.requirePositiveBalance ||
            this.config.basic.excludeUtilityTokens ||
            this.config.whitelistedContracts.length > 0 ||
            this.config.blacklistedContracts.length > 0 ||
            !!this.config.metadata.requireImage ||
            !!this.config.metadata.requireName
        );
    }

    /**
     * Get a summary of filter impact for logging/debugging
     */
    getFilterSummary(result: FilterResult): string {
        const { originalCount, filteredCount, filterStats } = result;
        const removed = originalCount - filteredCount;
        const percentage = originalCount > 0 ? ((removed / originalCount) * 100).toFixed(1) : "0";

        let summary = `Filtered ${removed}/${originalCount} tokens (${percentage}%)`;

        if (filterStats.removedByMetadata > 0) summary += `, metadata: ${filterStats.removedByMetadata}`;
        if (filterStats.removedByBalance > 0) summary += `, balance: ${filterStats.removedByBalance}`;
        if (filterStats.removedByUtilityRules > 0) summary += `, utility: ${filterStats.removedByUtilityRules}`;
        if (filterStats.removedByContract > 0) summary += `, contract: ${filterStats.removedByContract}`;
        if (filterStats.removedByImageRequirement > 0) summary += `, image: ${filterStats.removedByImageRequirement}`;
        if (filterStats.removedByNameRequirement > 0) summary += `, name: ${filterStats.removedByNameRequirement}`;

        return summary;
    }
}

// Export singleton instance using default configuration
export const filterEngine = new FilterEngine();
