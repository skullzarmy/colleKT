import * as THREE from "three";
import { NFTToken } from "./types";
import { extractPossibleUris, getIPFSUrl } from "./uri-utils";

/**
 * Standard texture loading configuration
 */
const TEXTURE_CONFIG = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    flipY: false,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    crossOrigin: "anonymous" as const,
};

/**
 * Loads a texture from a URL with standardized settings
 */
export function loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin(TEXTURE_CONFIG.crossOrigin);

        loader.load(
            url,
            (texture) => {
                texture.minFilter = TEXTURE_CONFIG.minFilter;
                texture.magFilter = TEXTURE_CONFIG.magFilter;
                texture.generateMipmaps = TEXTURE_CONFIG.generateMipmaps;
                texture.flipY = TEXTURE_CONFIG.flipY;
                texture.wrapS = TEXTURE_CONFIG.wrapS;
                texture.wrapT = TEXTURE_CONFIG.wrapT;
                texture.needsUpdate = true;
                resolve(texture);
            },
            undefined,
            reject
        );
    });
}

/**
 * Attempts to load a texture for an NFT, trying multiple URIs as fallbacks
 */
export async function loadTextureWithFallback(nft: NFTToken): Promise<THREE.Texture | null> {
    const metadata = nft.metadata;
    if (!metadata) return null;

    const possibleUris = extractPossibleUris(metadata);

    // Try each URI until one works
    for (const { uri, source } of possibleUris) {
        try {
            const mediaUrl = getIPFSUrl(uri);
            const texture = await loadTexture(mediaUrl);
            return texture;
        } catch (err) {
            // Continue to next URI
        }
    }

    return null;
}

/**
 * Preloads textures for a batch of NFTs
 */
export async function preloadTextures(
    nfts: NFTToken[],
    onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, THREE.Texture>> {
    const textureMap = new Map<string, THREE.Texture>();

    const promises = nfts.map(async (nft, index) => {
        try {
            const texture = await loadTextureWithFallback(nft);
            if (texture) {
                textureMap.set(nft.id, texture);
            }
            onProgress?.(index + 1, nfts.length);
        } catch (err) {
            onProgress?.(index + 1, nfts.length);
        }
    });

    await Promise.all(promises);
    return textureMap;
}
