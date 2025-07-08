/**
 * Utility functions for handling NFT text display in 3D environment
 */

/**
 * Sanitizes and formats NFT names for display on gallery walls
 */
export function sanitizeNFTName(
    name: string | undefined | null,
    tokenId: string | number,
    maxLength: number = 30
): string {
    // Fallback to token ID if no name
    if (!name || name.trim().length === 0) {
        return `Token #${tokenId}`;
    }

    // Clean the name
    let cleanName = name.trim();

    // Remove or replace problematic characters
    cleanName = cleanName
        // Replace common problematic chars with safe alternatives
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/[–—]/g, "-")
        .replace(/[…]/g, "...")
        // Remove zero-width chars and other invisible nonsense
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        // Replace multiple whitespace with single space
        .replace(/\s+/g, " ")
        // Remove control characters except newlines/tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Handle emojis and special Unicode - keep them but be aware they might not render
    // For now, we'll keep them since Three.js can handle basic emoji display

    // Smart truncation
    if (cleanName.length > maxLength) {
        // Try to break at word boundaries
        const words = cleanName.split(" ");
        let result = "";

        for (const word of words) {
            if ((result + " " + word).length > maxLength - 3) {
                break;
            }
            result += (result ? " " : "") + word;
        }

        // If we got at least one word, use it
        if (result.length > 0) {
            cleanName = result + "...";
        } else {
            // If even the first word is too long, hard truncate
            cleanName = cleanName.substring(0, maxLength - 3) + "...";
        }
    }

    // Final safety check - if we ended up with empty string, fallback
    if (cleanName.trim().length === 0) {
        return `Token #${tokenId}`;
    }

    return cleanName;
}

/**
 * Gets appropriate font size based on text length for 3D display
 */
export function getDynamicFontSize(text: string, baseSize: number = 0.3): number {
    const length = text.length;

    if (length <= 10) return baseSize;
    if (length <= 20) return baseSize * 0.9;
    if (length <= 30) return baseSize * 0.8;
    return baseSize * 0.7;
}

/**
 * Determines if text should be displayed on multiple lines
 */
export function shouldUseMultiLine(text: string, maxLineLength: number = 20): boolean {
    return text.length > maxLineLength && text.includes(" ");
}

/**
 * Splits text into multiple lines for better 3D display
 */
export function splitTextForDisplay(text: string, maxLineLength: number = 20): string[] {
    if (text.length <= maxLineLength) {
        return [text];
    }

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if ((currentLine + " " + word).length > maxLineLength) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                // Single word longer than max length
                lines.push(word);
            }
        } else {
            currentLine += (currentLine ? " " : "") + word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    // Limit to maximum 2 lines for 3D display
    return lines.slice(0, 2);
}
