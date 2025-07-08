import { NFTToken } from "./types";

/**
 * Processes raw API response data into standardized NFTToken format
 */
export function processNFTFromAPI(item: any): NFTToken {
    return {
        id: `${item.token.contract.address}_${item.token.tokenId}`,
        token_id: item.token.tokenId,
        balance: item.balance,
        contract: {
            address: item.token.contract.address,
            alias: item.token.contract.alias,
        },
        metadata: item.token.metadata,
    };
}

/**
 * Filters NFTs to only include those with valid metadata and balance
 */
export function filterValidNFTs(items: any[]): NFTToken[] {
    return items
        .filter((item: any) => {
            const hasMetadata = item.token?.metadata;
            const hasBalance = item.balance > 0;
            return hasMetadata && hasBalance;
        })
        .map(processNFTFromAPI);
}

/**
 * Logs detailed debug information for NFTs with missing image URIs
 */
export function debugNFTMetadata(nft: NFTToken, reason: string = "No image URI found"): void {
    // Debug logging disabled in production
}
