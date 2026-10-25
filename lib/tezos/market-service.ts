/**
 * Marketplace Service for In-Modal Buying with Platform Referral
 *
 * 1. Fetches active fixed-price listings (asks) for any token from Objkt GraphQL.
 * 2. Executes the purchase using the connected Octez.connect DAppClient, routing through
 *    the Objkt marketplace contract with the platform referrer parameter.
 */

import { TezosOperationType, type DAppClient } from "@tezos-x/octez.connect-sdk";

export interface ActiveListing {
    id: string;
    priceMutez: number;
    priceTez: number;
    amount: number;
    currency: string;
    marketplaceContract: string;
}

const OBJKT_GRAPHQL = "https://data.objkt.com/v3/graphql";
export const PLATFORM_REFERRER = "tz1Qi77tcJn9foeHHP1QHj6UX1m1vLVLMbuY"; // skllzrmy.tez
export const DEFAULT_MARKETPLACE_V3 = "KT1Xo5B7PNTXSVZCLC1qKnprK0DNtPHTn530";

/**
 * Fetch the lowest active fixed-price listing for a token
 */
export async function fetchTokenListing(
    contract: string,
    tokenId: string
): Promise<ActiveListing | null> {
    if (!contract || tokenId === undefined) return null;

    const query = `
        query GetActiveListing($contract: String!, $tokenId: String!) {
            listing_active(
                where: {
                    token: { fa_contract: { _eq: $contract }, token_id: { _eq: $tokenId } }
                }
                order_by: { price: asc }
                limit: 1
            ) {
                id
                price
                amount
                currency {
                    symbol
                    decimals
                }
                marketplace {
                    contract
                }
            }
        }
    `;

    try {
        const response = await fetch(OBJKT_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { contract, tokenId: String(tokenId) },
            }),
            next: { revalidate: 30 },
        });

        if (!response.ok) return null;

        const body = (await response.json()) as {
            data?: {
                listing_active?: Array<{
                    id: number | string;
                    price: number;
                    amount: number;
                    currency?: { symbol?: string; decimals?: number };
                    marketplace?: { contract?: string };
                }>;
            };
        };

        const listing = body.data?.listing_active?.[0];
        if (!listing) return null;

        const priceMutez = listing.price;
        const decimals = listing.currency?.decimals || 6;
        const priceTez = priceMutez / Math.pow(10, decimals);

        return {
            id: String(listing.id),
            priceMutez,
            priceTez,
            amount: listing.amount || 1,
            currency: listing.currency?.symbol || "XTZ",
            marketplaceContract: listing.marketplace?.contract || DEFAULT_MARKETPLACE_V3,
        };
    } catch (error) {
        console.error("Failed to fetch token listing:", error);
        return null;
    }
}

/**
 * Fulfill an ask (buy token) via Objkt marketplace contract passing the referrer parameter
 */
export async function fulfillAskWithReferral(
    client: DAppClient,
    listing: ActiveListing,
    referrerAddress: string = PLATFORM_REFERRER
): Promise<{ hash: string }> {
    const targetMarketplace = listing.marketplaceContract || DEFAULT_MARKETPLACE_V3;

    // Fulfill_ask parameter structure:
    // pair (nat %ask_id) (option %referrer address)
    const parameters = {
        entrypoint: "fulfill_ask",
        value: {
            prim: "Pair",
            args: [
                { int: String(listing.id) },
                { prim: "Some", args: [{ string: referrerAddress }] },
            ],
        },
    };

    const operation = {
        kind: TezosOperationType.TRANSACTION as const,
        destination: targetMarketplace,
        amount: String(listing.priceMutez),
        parameters: parameters as never,
    };

    const result = await client.requestOperation({
        operationDetails: [operation],
    });

    const hash = (result as { transactionHash: string }).transactionHash;
    return { hash };
}
