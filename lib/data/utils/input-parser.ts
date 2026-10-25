/**
 * Comprehensive Input Parser
 *
 * Single utility handling ALL input types for the gallery system:
 * - Tezos addresses (tz1, tz2, tz3, KT1)
 * - Domain names (.tez, etc.)
 * - objkt.com URLs (curations and collections)
 * - Raw IDs (curation IDs and slugs)
 *
 * Replaces and extends the existing resolveDomainToAddress functionality
 * while preserving all existing behavior for USER galleries.
 */

import { tzktSdkClient } from "../sources/tzkt-sdk-client";
import {
    GalleryType,
    ParsedInput,
    generateGalleryRoute,
    isValidTezosAddress,
    isValidContractAddress,
    isValidTezosDomain,
    isValidCurationId,
    isValidCurationSlug,
} from "../types/gallery-types";

// Comprehensive input parser that handles ALL use cases
export class InputParser {
    /**
     * Main parsing method - handles ALL input types
     * This is the single entry point that replaces resolveDomainToAddress
     */
    static async parse(input: string): Promise<ParsedInput> {
        const trimmed = input.trim();

        if (!trimmed) {
            return this.createInvalidResult(trimmed, "Empty input");
        }

        // 1. Single Token Detection (e.g. objkt token URL, KT1...:123)
        const singleTokenResult = this.parseSingleToken(trimmed);
        if (singleTokenResult.isValid) return singleTokenResult;

        // 2. Aleatory.art URL Detection (generators and pieces)
        const aleatoryResult = this.parseAleatoryUrl(trimmed);
        if (aleatoryResult.isValid) return aleatoryResult;

        // 3. Tezos Address Detection (tz1, tz2, tz3, KT1)
        const addressResult = this.parseAddress(trimmed);
        if (addressResult.isValid) return addressResult;

        // 4. objkt.com URL Detection (curations and collections)
        const objktResult = this.parseObjktUrl(trimmed);
        if (objktResult.isValid) return objktResult;

        // 5. Raw ID Detection (pure numbers for curations, contract addresses)
        const idResult = this.parseRawId(trimmed);
        if (idResult.isValid) return idResult;

        // 6. Domain Resolution (tezos domains, .tez, etc.)
        const domainResult = await this.parseDomain(trimmed);
        if (domainResult.isValid) return domainResult;

        return this.createInvalidResult(trimmed, "Unrecognized input format");
    }

    /**
     * Parse single token inputs (e.g. objkt token URL, KT1...:123)
     */
    private static parseSingleToken(input: string): ParsedInput {
        // Pattern 1: objkt.com/tokens/KT1.../123 or objkt.com/asset/KT1.../123
        const objktTokenMatch = input.match(/objkt\.com\/(?:tokens|asset)\/(KT1[a-zA-Z0-9]{33})\/(\d+)/);
        if (objktTokenMatch) {
            const contract = objktTokenMatch[1];
            const tokenId = objktTokenMatch[2];
            return {
                type: "COLLECTION",
                id: contract,
                contractAddress: contract,
                isValid: true,
                route: `/collection/${contract}?token=${tokenId}`,
                metadata: {
                    inputType: "single-token",
                    originalInput: input,
                    extractedId: tokenId,
                },
            };
        }

        // Pattern 2: KT1...:123 or KT1.../token/123
        const directTokenMatch = input.match(/^(KT1[a-zA-Z0-9]{33})[:/](?:token\/)?(\d+)$/);
        if (directTokenMatch) {
            const contract = directTokenMatch[1];
            const tokenId = directTokenMatch[2];
            return {
                type: "COLLECTION",
                id: contract,
                contractAddress: contract,
                isValid: true,
                route: `/collection/${contract}?token=${tokenId}`,
                metadata: {
                    inputType: "single-token",
                    originalInput: input,
                    extractedId: tokenId,
                },
            };
        }

        return this.createInvalidResult(input, "Not a single token format");
    }

    /**
     * Parse aleatory.art URLs (generators and pieces)
     */
    private static parseAleatoryUrl(input: string): ParsedInput {
        // Piece URL: aleatory.art/piece/KT1.../123
        const pieceMatch = input.match(/aleatory\.art\/piece\/(KT1[a-zA-Z0-9]{33})\/(\d+)/);
        if (pieceMatch) {
            const contract = pieceMatch[1];
            const tokenId = pieceMatch[2];
            return {
                type: "COLLECTION",
                id: contract,
                contractAddress: contract,
                isValid: true,
                route: `/collection/${contract}?token=${tokenId}&aleatory=true`,
                metadata: {
                    inputType: "single-token",
                    originalInput: input,
                    extractedId: tokenId,
                },
            };
        }

        // Generator URL: aleatory.art/generator/KT1...
        const generatorMatch = input.match(/aleatory\.art\/generator\/(KT1[a-zA-Z0-9]{33})/);
        if (generatorMatch) {
            const contract = generatorMatch[1];
            return {
                type: "COLLECTION",
                id: contract,
                contractAddress: contract,
                isValid: true,
                route: `/collection/${contract}?aleatory=true`,
                metadata: {
                    inputType: "aleatory-generator",
                    originalInput: input,
                    extractedId: contract,
                },
            };
        }

        return this.createInvalidResult(input, "Not an aleatory.art URL");
    }

    /**
     * Parse Tezos addresses (tz1, tz2, tz3, KT1)
     * Preserves existing USER gallery functionality
     */
    private static parseAddress(input: string): ParsedInput {
        // USER addresses (implicit accounts) - EXISTING FUNCTIONALITY
        if (isValidTezosAddress(input)) {
            return {
                type: "USER",
                id: input,
                isValid: true,
                route: generateGalleryRoute("USER", input),
                metadata: {
                    inputType: "address",
                    originalInput: input,
                },
            };
        }

        // COLLECTION addresses (contracts) - NEW FUNCTIONALITY
        if (isValidContractAddress(input)) {
            return {
                type: "COLLECTION",
                id: input,
                contractAddress: input,
                isValid: true,
                route: generateGalleryRoute("COLLECTION", input),
                metadata: {
                    inputType: "address",
                    originalInput: input,
                },
            };
        }

        return this.createInvalidResult(input, "Invalid address format");
    }

    /**
     * Parse objkt.com URLs (comprehensive pattern matching)
     * NEW FUNCTIONALITY for curation and collection URLs
     */
    private static parseObjktUrl(input: string): ParsedInput {
        // Collection URLs: objkt.com/collections/KT1...
        const collectionMatch = input.match(/objkt\.com\/collections\/(KT1[a-zA-Z0-9]{33})/);
        if (collectionMatch) {
            const contractAddress = collectionMatch[1];
            return {
                type: "COLLECTION",
                id: contractAddress,
                contractAddress,
                isValid: true,
                route: generateGalleryRoute("COLLECTION", contractAddress),
                metadata: {
                    inputType: "objkt-collection",
                    originalInput: input,
                    extractedId: contractAddress,
                },
            };
        }

        // Curation URLs: Multiple patterns supported
        const curationPatterns = [
            /objkt\.com\/curations\/.*?([a-f0-9]{8})$/, // Hash slug at end
            /objkt\.com\/curations\/(\d+)/, // Pure ID
            /objkt\.com\/curations\/objkt\/.*?([a-f0-9]{8})$/, // objkt-specific with hash
        ];

        for (const pattern of curationPatterns) {
            const match = input.match(pattern);
            if (match) {
                const curationId = match[1];
                return {
                    type: "CURATION",
                    id: curationId,
                    isValid: true,
                    route: generateGalleryRoute("CURATION", curationId),
                    metadata: {
                        inputType: "objkt-curation",
                        originalInput: input,
                        extractedId: curationId,
                    },
                };
            }
        }

        return this.createInvalidResult(input, "Unrecognized objkt.com URL format");
    }

    /**
     * Parse raw IDs (numbers for curations, contract addresses)
     * NEW FUNCTIONALITY for direct curation ID/slug input
     */
    private static parseRawId(input: string): ParsedInput {
        // Pure numeric ID - likely a curation
        if (isValidCurationId(input)) {
            return {
                type: "CURATION",
                id: input,
                isValid: true,
                route: generateGalleryRoute("CURATION", input),
                metadata: {
                    inputType: "raw-id",
                    originalInput: input,
                },
            };
        }

        // 8-character hex hash - curation slug
        if (isValidCurationSlug(input)) {
            return {
                type: "CURATION",
                id: input,
                isValid: true,
                route: generateGalleryRoute("CURATION", input),
                metadata: {
                    inputType: "raw-id",
                    originalInput: input,
                },
            };
        }

        return this.createInvalidResult(input, "Unrecognized ID format");
    }

    /**
     * Parse and resolve domain names
     * PRESERVES EXISTING FUNCTIONALITY - same logic as resolveDomainToAddress
     */
    private static async parseDomain(input: string): Promise<ParsedInput> {
        try {
            // Skip if it looks like an address or URL
            if (isValidTezosAddress(input) || isValidContractAddress(input) || input.includes("/")) {
                return this.createInvalidResult(input, "Not a domain");
            }

            // EXISTING LOGIC: Use TzKT SDK for domain resolution (unchanged)
            const domains = await tzktSdkClient.getDomainsByName(input, 1);
            if (domains.length > 0 && domains[0].address?.address) {
                const resolvedAddress = domains[0].address.address;
                return {
                    type: "USER",
                    id: resolvedAddress,
                    isValid: true,
                    route: generateGalleryRoute("USER", resolvedAddress),
                    metadata: {
                        inputType: "domain",
                        originalInput: input,
                        resolvedAddress,
                    },
                };
            }

            return this.createInvalidResult(input, "Domain not found");
        } catch (error) {
            return this.createInvalidResult(input, `Domain resolution failed: ${error}`);
        }
    }

    /**
     * Create standardized invalid result
     */
    private static createInvalidResult(input: string, error: string): ParsedInput {
        return {
            type: "USER",
            id: "",
            isValid: false,
            error,
            route: "",
            metadata: {
                inputType: "address",
                originalInput: input,
            },
        };
    }
}

// Convenience function for simple parsing (main export)
export async function parseInput(input: string): Promise<ParsedInput> {
    return InputParser.parse(input);
}

// Legacy compatibility - same signature as existing resolveDomainToAddress
export async function resolveDomainToAddress(input: string): Promise<string | null> {
    const result = await parseInput(input);
    return result.isValid ? result.id : null;
}
