import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Utility to get image dimensions from URL
export const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
            });
        };

        img.onerror = () => {
            // Fallback to square if image fails to load
            resolve({ width: 1, height: 1 });
        };

        img.src = url;
    });
};

// Convert IPFS URL or raw CID to clean HTTPS gateway URL
export const getIPFSUrl = (uri?: string | null): string => {
    if (!uri || typeof uri !== "string") return "";

    let cleaned = uri.trim();
    if (!cleaned) return "";

    // Data URLs pass through untouched
    if (cleaned.startsWith("data:")) return cleaned;

    // Standardize various IPFS prefix permutations
    if (cleaned.startsWith("ipfs://ipfs/")) {
        cleaned = cleaned.replace("ipfs://ipfs/", "");
    } else if (cleaned.startsWith("ipfs://")) {
        cleaned = cleaned.replace("ipfs://", "");
    } else if (cleaned.startsWith("/ipfs/")) {
        cleaned = cleaned.replace("/ipfs/", "");
    } else if (cleaned.startsWith("ipfs/")) {
        cleaned = cleaned.replace("ipfs/", "");
    } else if (cleaned.includes("/ipfs/")) {
        // e.g. https://ipfs.io/ipfs/Qm... or https://cloudflare-ipfs.com/ipfs/Qm...
        cleaned = cleaned.substring(cleaned.indexOf("/ipfs/") + 6);
    }

    // If it was transformed from an IPFS path, or if it is a raw CIDv0 / CIDv1
    if (
        cleaned !== uri ||
        /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55})/i.test(cleaned)
    ) {
        // Ensure CID followed directly by query params has a trailing slash before '?'
        // e.g. Qm123?m0=0.831 -> Qm123/?m0=0.831
        cleaned = cleaned.replace(/^([a-zA-Z0-9]+)\?/, "$1/?");
        return `https://ipfs.fileship.xyz/${cleaned}`;
    }

    return cleaned;
};
