/**
 * Server-side API route for USER gallery token collection data
 *
 * Handles cache-first token collection fetching with Redis caching,
 * filtering, and pagination for USER galleries (wallet-based).
 * All Redis operations are server-side only.
 */

import { NextRequest, NextResponse } from "next/server";
import { dataOrchestrator } from "@/lib/data/orchestrator/data-orchestrator";

/**
 * GET /api/user
 *
 * Query params:
 * - address: Tezos address (wallet address)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20)
 * - forceRefresh: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");
        const forceRefresh = searchParams.get("forceRefresh") === "true";

        if (!address) {
            return NextResponse.json({ error: "Address parameter is required" }, { status: 400 });
        }

        // Use data orchestrator for cache-first USER gallery fetching
        const result = await dataOrchestrator.getTokenCollection({
            address,
            pagination: { page, pageSize },
            forceRefresh,
            applyFilters: true,
            cacheResults: true,
            sortChronologically: true,
        });

        return NextResponse.json({
            success: true,
            data: {
                tokens: result.tokens,
                pagination: result.pagination,
                cacheInfo: {
                    hit: result.cache.hit,
                    source: result.cache.source,
                    buildTimeMs: result.cache.buildTimeMs,
                },
                performance: {
                    totalTimeMs: result.performance.totalTimeMs,
                    fetchTimeMs: result.performance.fetchTimeMs,
                    filterTimeMs: result.performance.filterTimeMs,
                },
            },
        });
    } catch (error) {
        console.error("User gallery API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
