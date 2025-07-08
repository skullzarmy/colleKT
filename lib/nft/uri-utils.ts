import { NFTToken, NFTMetadata, UriSource } from "./types";

/**
 * Converts IPFS URIs to HTTP URLs using the configured gateway
 */
export function getIPFSUrl(uri: string): string {
    if (uri.startsWith("ipfs://")) {
        // Extract CID and preserve any query parameters
        const withoutProtocol = uri.replace("ipfs://", "");
        return `https://ipfs.fileship.xyz/${withoutProtocol}`;
    }
    return uri;
}

/**
 * Detects if a URI is likely an image based on file extension and content type
 */
export function isImageUri(uri: string): boolean {
    if (!uri) return false;

    // Check file extension
    const lowerUri = uri.toLowerCase();
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
    const hasImageExtension = imageExtensions.some((ext) => lowerUri.includes(ext));

    // Check for HTML indicators
    const htmlIndicators = [".html", "text/html", "<html", "<!doctype"];
    const isHtml = htmlIndicators.some((indicator) => lowerUri.includes(indicator));

    return hasImageExtension && !isHtml;
}

/**
 * Extracts all possible URIs from NFT metadata in priority order
 */
export function extractPossibleUris(metadata: NFTMetadata): UriSource[] {
    return [
        { uri: metadata.display_uri, source: "display_uri" },
        { uri: metadata.displayUri, source: "displayUri" },
        { uri: metadata.image, source: "image" },
        { uri: metadata.thumbnail_uri, source: "thumbnail_uri" },
        { uri: metadata.thumbnailUri, source: "thumbnailUri" },
        { uri: metadata.artifact_uri, source: "artifact_uri" },
        { uri: metadata.artifactUri, source: "artifactUri" },
        { uri: metadata.formats?.[0]?.uri, source: "formats[0].uri" },
        // Additional fallbacks for different standards
        { uri: (metadata as any).imageUri, source: "imageUri" },
        { uri: (metadata as any).media?.[0]?.uri, source: "media[0].uri" },
        { uri: (metadata as any).assets?.[0]?.uri, source: "assets[0].uri" },
    ].filter((item) => item.uri && typeof item.uri === "string") as UriSource[];
}

/**
 * Gets the best available image URI from NFT metadata
 */
export function getImageUri(nft: NFTToken): string | null {
    const metadata = nft.metadata;
    if (!metadata) return null;

    const possibleUris = extractPossibleUris(metadata);

    // First, try to find URIs that are likely images
    const imageUris = possibleUris.filter((item) => isImageUri(item.uri));

    if (imageUris.length > 0) {
        return imageUris[0].uri;
    }

    // If no obvious image URIs, fall back to first available URI
    const foundUri = possibleUris[0]?.uri;

    return foundUri || null;
}

/**
 * Gets the MIME type from NFT metadata formats
 */
export function getMimeType(nft: NFTToken): string | undefined {
    return nft.metadata?.formats?.[0]?.mimeType;
}

/**
 * Checks if NFT content is HTML based on URI or MIME type
 */
export function isHtmlContent(nft: NFTToken): boolean {
    const uri = getImageUri(nft);
    const mimeType = getMimeType(nft);

    if (mimeType && mimeType.includes("html")) {
        return true;
    }

    if (uri) {
        const lowerUri = uri.toLowerCase();
        const htmlIndicators = [".html", "text/html", "<html", "<!doctype"];
        return htmlIndicators.some((indicator) => lowerUri.includes(indicator));
    }

    return false;
}
