/**
 * Canonical Aleatory Client & Storage Decoder
 *
 * Implements:
 * 1. Storage decompression (gzip / identity) for on-chain art.code (ALEATORY-001)
 * 2. Sale & minting status detection (price, edition size, minted count, paused)
 * 3. Mint operation execution via connected wallet
 */

import { TezosOperationType, type DAppClient } from "@tezos-x/octez.connect-sdk";
import { getIPFSUrl } from "@/lib/utils";

export interface AleatoryStorage {
    administrator?: string;
    art?: {
        code: string;
        code_encoding: string;
        code_uri: string;
        code_hash: string;
        code_sealed?: boolean;
        pending_metadata?: string;
    };
    sale?: {
        price: string;
        edition_size: string;
        paused: boolean;
    };
    next_token_id?: string;
}

export interface AleatorySaleInfo {
    priceMutez: string;
    priceTez: number;
    editionSize: number;
    mintedCount: number;
    isPaused: boolean;
    isMinting: boolean;
}

const codeCache = new Map<string, string>();
const storageCache = new Map<string, { data: AleatoryStorage; fetchedAt: number }>();
const STORAGE_TTL_MS = 15_000;

export function utf8ToHex(s: string): string {
    return Array.from(new TextEncoder().encode(s))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Decode on-chain art.code from hex.
 * If encoding is "gzip", decompresses stream; otherwise decodes via TextDecoder.
 */
export async function decodeCode(hex: string, encoding: string): Promise<string> {
    const clean = hex.replace(/^0x/, "");
    if (clean.length === 0) return "";
    if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) return "";

    const bytes = new Uint8Array((clean.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)));
    if (encoding !== "gzip") {
        return new TextDecoder().decode(bytes);
    }

    try {
        const stream = new Blob([bytes as unknown as BlobPart])
            .stream()
            .pipeThrough(new DecompressionStream("gzip"));
        return await new Response(stream).text();
    } catch (e) {
        console.warn("[AleatoryClient] Failed to decompress gzip code:", e);
        return new TextDecoder().decode(bytes);
    }
}

/**
 * Fetch generator storage from TzKT
 */
export async function fetchAleatoryStorage(contractAddress: string): Promise<AleatoryStorage | null> {
    if (!contractAddress || !contractAddress.startsWith("KT1")) return null;

    const cached = storageCache.get(contractAddress);
    if (cached && Date.now() - cached.fetchedAt < STORAGE_TTL_MS) {
        return cached.data;
    }

    try {
        const res = await fetch(`https://api.tzkt.io/v1/contracts/${contractAddress}/storage`, {
            cache: "no-store",
        });
        if (!res.ok) return null;
        const data = (await res.json()) as AleatoryStorage;
        storageCache.set(contractAddress, { data, fetchedAt: Date.now() });
        return data;
    } catch (err) {
        console.warn("[AleatoryClient] Failed to fetch storage:", err);
        return null;
    }
}

/**
 * Retrieve the full executable interactive artwork code for an Aleatory contract
 */
export async function fetchAleatoryCode(contractAddress: string): Promise<string> {
    if (!contractAddress) return "";
    if (codeCache.has(contractAddress)) {
        return codeCache.get(contractAddress)!;
    }

    const storage = await fetchAleatoryStorage(contractAddress);
    if (!storage?.art) return "";

    let code = "";
    if (storage.art.code && storage.art.code.length > 2) {
        code = await decodeCode(storage.art.code, storage.art.code_encoding || "identity");
    } else if (storage.art.code_uri) {
        const url = getIPFSUrl(storage.art.code_uri);
        try {
            const res = await fetch(url);
            if (res.ok) code = await res.text();
        } catch (e) {
            console.warn("[AleatoryClient] Failed to fetch code_uri:", e);
        }
    }

    if (code) {
        codeCache.set(contractAddress, code);
    }

    return code;
}

/**
 * Read the current live sale & mint status of an Aleatory generator
 */
export async function fetchAleatorySaleInfo(contractAddress: string): Promise<AleatorySaleInfo | null> {
    const storage = await fetchAleatoryStorage(contractAddress);
    if (!storage?.sale) return null;

    const priceMutez = storage.sale.price || "0";
    const priceTez = parseInt(priceMutez, 10) / 1_000_000;
    const editionSize = parseInt(storage.sale.edition_size || "0", 10);
    const mintedCount = parseInt(storage.next_token_id || "0", 10);
    const isPaused = Boolean(storage.sale.paused);
    const isMinting = !isPaused && (editionSize === 0 || mintedCount < editionSize);

    return {
        priceMutez,
        priceTez,
        editionSize,
        mintedCount,
        isPaused,
        isMinting,
    };
}

/**
 * Mint one edition from an Aleatory generator contract using connected wallet
 */
export async function mintAleatoryPiece(
    client: DAppClient,
    generatorContract: string,
    priceMutez: string | bigint,
    paramsJson: string = "{}"
): Promise<{ hash: string }> {
    const hex = utf8ToHex(paramsJson);
    const operation = {
        kind: TezosOperationType.TRANSACTION as const,
        destination: generatorContract,
        amount: String(priceMutez),
        parameters: {
            entrypoint: "mint",
            value: { bytes: hex },
        } as never,
    };

    const result = await client.requestOperation({
        operationDetails: [operation],
    });

    const hash = (result as { transactionHash: string }).transactionHash;
    return { hash };
}
