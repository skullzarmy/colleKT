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

// Convert IPFS URL to HTTP
export const getIPFSUrl = (uri: string): string => {
    if (uri.startsWith("ipfs://")) {
        const withoutProtocol = uri.replace("ipfs://", "");
        return `https://ipfs.fileship.xyz/${withoutProtocol}`;
    }
    return uri;
};
