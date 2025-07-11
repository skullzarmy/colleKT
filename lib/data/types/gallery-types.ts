/**
 * Gallery Type System
 *
 * Comprehensive type definitions for all gallery variants:
 * - USER: Original wallet galleries (tz1/tz2/tz3 addresses + domains)
 * - CURATION: objkt.com curations
 * - COLLECTION: Contract-based collections
 */

// Gallery types supported by the system
export type GalleryType = "USER" | "CURATION" | "COLLECTION";

// Input type classification for metadata
export type InputType = "address" | "domain" | "objkt-curation" | "objkt-collection" | "raw-id";

// Comprehensive parsed input result
export interface ParsedInput {
    type: GalleryType;
    id: string; // address, domain, curation ID, etc.
    contractAddress?: string; // for COLLECTION type
    isValid: boolean;
    error?: string;
    route: string; // complete route to navigate to
    metadata: {
        inputType: InputType;
        originalInput: string;
        resolvedAddress?: string; // for domains that resolve to addresses
        extractedId?: string; // for URLs that contain IDs
    };
}

// Gallery configuration interface
export interface GalleryConfig {
    type: GalleryType;
    identifier: string; // address, curation ID, or collection address
    source: "tzkt" | "objkt";
    title?: string;
    description?: string;
}

// Type guards for gallery types
export function isUserGallery(parsed: ParsedInput): boolean {
    return parsed.type === "USER" && parsed.isValid;
}

export function isCurationGallery(parsed: ParsedInput): boolean {
    return parsed.type === "CURATION" && parsed.isValid;
}

export function isCollectionGallery(parsed: ParsedInput): boolean {
    return parsed.type === "COLLECTION" && parsed.isValid;
}

// Route generation helpers
export function generateGalleryRoute(type: GalleryType, id: string): string {
    switch (type) {
        case "USER":
            return `/gallery/${id}`;
        case "CURATION":
            return `/curation/${id}`;
        case "COLLECTION":
            return `/collection/${id}`;
        default:
            throw new Error(`Unknown gallery type: ${type}`);
    }
}

// Validation helper for gallery identifiers
export function validateGalleryIdentifier(type: GalleryType, identifier: string): boolean {
    switch (type) {
        case "USER":
            return isValidTezosAddress(identifier) || isValidTezosDomain(identifier);
        case "CURATION":
            return isValidCurationId(identifier) || isValidCurationSlug(identifier);
        case "COLLECTION":
            return isValidContractAddress(identifier);
        default:
            return false;
    }
}

// Address validation helpers
export function isValidTezosAddress(address: string): boolean {
    return /^(tz1|tz2|tz3)[a-zA-Z0-9]{33}$/.test(address);
}

export function isValidContractAddress(address: string): boolean {
    return /^KT1[a-zA-Z0-9]{33}$/.test(address);
}

export function isValidTezosDomain(domain: string): boolean {
    // Basic domain validation - could be enhanced
    return (
        domain.length > 0 && !domain.includes("/") && !isValidTezosAddress(domain) && !isValidContractAddress(domain)
    );
}

// Curation validation helpers
export function isValidCurationId(id: string): boolean {
    return /^\d+$/.test(id); // Integer ID like "146288"
}

export function isValidCurationSlug(slug: string): boolean {
    return /^[a-f0-9]{8}$/.test(slug); // 8-character hex like "b264a749"
}
