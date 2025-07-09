import { NextRequest, NextResponse } from "next/server";
import { dataOrchestrator } from "@/lib/data/orchestrator/data-orchestrator";

/**
 * Clear cache API endpoint
 * POST /api/cache/clear
 *
 * Body:
 * - address: Tezos address to clear cache for
 * - clearAll: If true, clears ALL cache entries for the address (default: false)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { address, clearAll = false } = body;

        if (!address) {
            return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
        }

        console.log(`🗑️ Cache clear request for ${address} (clearAll: ${clearAll})`);

        if (clearAll) {
            // Clear all cache entries for this address (recommended for filter changes)
            await dataOrchestrator.clearAllCacheForAddress(address);
        } else {
            // Clear only current filter configuration cache
            await dataOrchestrator.invalidateCache(address);
        }

        return NextResponse.json({
            success: true,
            message: `Cache cleared for ${address}`,
            clearedAll: clearAll,
        });
    } catch (error) {
        console.error("Cache clear error:", error);
        return NextResponse.json(
            {
                error: "Failed to clear cache",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
